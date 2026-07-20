// app/checkout/page.tsx ka working code hai
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { useToast } from "@/components/toast/CustomToast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import EmptyCart from "@/components/cart/EmptyCart";
import { Gift, ShoppingBag } from "lucide-react";
import SavedAddressesSection from "@/components/checkout/SavedAddressesSection";
import LoyaltyRedemptionBox from "@/components/checkout/LoyaltyRedemptionBox";
import { getPharmaSessionId } from "@/app/lib/pharmaSession";
import { trackBeginCheckout, trackAddShippingInfo, trackAddPaymentInfo } from "@/lib/analytics";
import { getAttributionPayload } from "@/lib/attribution";
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
function StripeWrapper({
  children,
  clientSecret,
}: {
  children: React.ReactNode;
  clientSecret?: string;
}) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Payment/config`);
        if (!res.ok) {
          throw new Error(`Failed to load payment config (Status: ${res.status})`);
        }
        const text = await res.text();
        if (!text) {
          throw new Error("Empty response from payment config");
        }
        const json = JSON.parse(text);
        const pk = json?.data?.publishableKey;
        if (!pk) {
          throw new Error("Stripe publishable key is missing");
        }

        if (mounted) setStripePromise(loadStripe(pk));
      } catch (err: any) {
        console.error("Stripe initialization failed:", err);
        if (mounted) {
          setError(err?.message || "Failed to initialize payment gateway");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 my-2">
        {error}
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
        <svg className="animate-spin h-4 w-4 text-[#445D41]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading payment gateway...
      </div>
    );
  }

  const options = clientSecret
    ? { clientSecret, locale: "en-GB" as const }
    : undefined;

  return (
    <Elements stripe={stripePromise} options={options as any}>
      {children}
    </Elements>
  );
}
/* === Payment form as a child component === */
/* === CARD PAYMENT COMPONENT (FINAL PERFECT VERSION) === */
function CheckoutPayment({
  orderPayload,
  payAmount,
  clientSecret,
  orderId,
  onPaymentSuccess,
  onError,
}: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/success?orderId=${orderId}`,
        payment_method_data: {
          billing_details: {
            name: `${orderPayload.billingFirstName ?? ""} ${orderPayload.billingLastName ?? ""}`.trim() || undefined,
            email: orderPayload.customerEmail,
            address: {
              line1: orderPayload.billingAddressLine1 || undefined,
              country: "GB",
            },
          },
        },
      },
      redirect: "if_required",
    });

    if (result.error) {
      onError(result.error);
      setProcessing(false);
      return;
    }
if (!result.paymentIntent?.id) {
  onError({ message: "Payment failed" });
  setProcessing(false);
  return;
}
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/Payment/confirm/${result.paymentIntent.id}`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Payment confirmation failed:", err);
    }

    onPaymentSuccess({ data: { id: orderId } });
    setProcessing(false);
  };

  return (
    <div className="space-y-3">
      <PaymentElement />
    <button
  onClick={handlePay}
  disabled={!stripe || processing}
  className={`w-full py-3 rounded flex items-center justify-center gap-2 transition ${
    processing
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-[#445D41] hover:bg-[#3a5037] text-white"
  }`}
>
  {processing ? (
    <>
      <svg
        className="animate-spin h-4 w-4 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        />
      </svg>
      Processing payment
    </>
  ) : (
    `Pay ${formatCurrency(payAmount)}`
  )}
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
  const toast = useToast();
 const { cart, updateCart, updateQuantity,clearCart } = useCart();
  const { user, accessToken, isAuthenticated } = useAuth();
  
  // Billing fields
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [shippingError, setShippingError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [billingCompany, setBillingCompany] = useState("");
 const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("United Kingdom");
  //delivery methods
const [deliveryMethod, setDeliveryMethod] = useState<"HomeDelivery" | "ClickAndCollect">("HomeDelivery");
const [stores, setStores] = useState<any[]>([]);
const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
const [storeLoading, setStoreLoading] = useState(false);
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
  const [shippingPhone, setShippingPhone] = useState("");
  const [notes, setNotes] = useState("");
 const [addressQuery, setAddressQuery] = useState("");
const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // 🔹 Shipping address autocomplete states
const [shippingAddressQuery, setShippingAddressQuery] = useState("");
const [shippingAddressSuggestions, setShippingAddressSuggestions] = useState<AddressSuggestion[]>([]);
const [showShippingSuggestions, setShowShippingSuggestions] = useState(false);
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
    setShippingPhone(cleaned);
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
 
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);
// Resume-payment (Approach B): if a Pending unpaid order exists from an earlier
// attempt, the mount effect below redirects to the order page to complete payment.
const [orderSummary, setOrderSummary] = useState<{
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  bundleDiscountAmount: number;
  taxAmount: number;
  totalAmount: number;
} | null>(null);


  const [isPlacing, setIsPlacing] = useState(false);
// ✅ Terms & Newsletter states
const [acceptTerms, setAcceptTerms] = useState(true);
const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
const [pointsDiscount, setPointsDiscount] = useState(0);
const [pointsToRedeem, setPointsToRedeem] = useState(0);

// ✅ BUY NOW SAFE STATE
const [buyNowItem, setBuyNowItem] = useState<any>(null);

useEffect(() => {
  const stored = sessionStorage.getItem("buyNowItem");

  if (stored) {
    try {
      setBuyNowItem(JSON.parse(stored));
    } catch {
      setBuyNowItem(null);
    }
  }
}, []);

// ── Resume pending payment (Approach B) ──────────────────────────────────
// On mount, if a Pending unpaid order was created earlier in this browser,
// verify it's still unpaid via the public track endpoint and offer to resume.
useEffect(() => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("pending_order") : null;
  if (!raw) return;

  let saved: any;
  try { saved = JSON.parse(raw); } catch { localStorage.removeItem("pending_order"); return; }

  // Ignore stale captures (older than 24h)
  if (!saved?.orderNumber || !saved?.orderId || (saved.ts && Date.now() - saved.ts > 24 * 60 * 60 * 1000)) {
    localStorage.removeItem("pending_order");
    return;
  }

  (async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Orders/track/${encodeURIComponent(saved.orderNumber)}?email=${encodeURIComponent(saved.email || "")}`
      );
      if (!res.ok) { localStorage.removeItem("pending_order"); return; }
      const json = await res.json();
      const o = json?.data;
      const status = String(o?.status ?? "").toLowerCase();
      const payStatus = String(o?.paymentStatus ?? "").toLowerCase();
      const paid = payStatus === "successful" || payStatus === "paid";
      const closed = ["cancelled", "refunded"].includes(status);

      // Still Pending and unpaid → send the customer to the order page to complete
      // payment (instead of a fresh checkout). The order-success page handles paying.
      if (o && status === "pending" && !paid && !closed) {
        router.replace(`/order/success?orderId=${o.id ?? saved.orderId}`);
      } else {
        localStorage.removeItem("pending_order");
      }
    } catch {
      // Network issue — keep the stored order; don't block checkout.
    }
  })();
}, []);

// Restore the billing/shipping details the customer typed for a still-pending order,
// so the checkout form is pre-filled when they come back (Approach B).
useEffect(() => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("checkout_form") : null;
  if (!raw) return;
  try {
    const f = JSON.parse(raw);
    if (f.billingFirstName) setBillingFirstName(f.billingFirstName);
    if (f.billingLastName) setBillingLastName(f.billingLastName);
    if (f.billingEmail) setBillingEmail(f.billingEmail);
    if (f.billingPhone) setBillingPhone(f.billingPhone);
    if (f.billingCompany) setBillingCompany(f.billingCompany);
    if (f.billingAddress1) setBillingAddress1(f.billingAddress1);
    if (f.billingAddress2) setBillingAddress2(f.billingAddress2);
    if (f.billingCity) setBillingCity(f.billingCity);
    if (f.billingState) setBillingState(f.billingState);
    if (f.billingPostalCode) setBillingPostalCode(f.billingPostalCode);
    if (f.billingCountry) setBillingCountry(f.billingCountry);
    if (f.deliveryMethod) setDeliveryMethod(f.deliveryMethod);
    if (typeof f.shippingSameAsBilling === "boolean") setShippingSameAsBilling(f.shippingSameAsBilling);
    if (f.shippingFirstName) setShippingFirstName(f.shippingFirstName);
    if (f.shippingLastName) setShippingLastName(f.shippingLastName);
    if (f.shippingCompany) setShippingCompany(f.shippingCompany);
    if (f.shippingAddress1) setShippingAddress1(f.shippingAddress1);
    if (f.shippingAddress2) setShippingAddress2(f.shippingAddress2);
    if (f.shippingCity) setShippingCity(f.shippingCity);
    if (f.shippingState) setShippingState(f.shippingState);
    if (f.shippingPostalCode) setShippingPostalCode(f.shippingPostalCode);
    if (f.shippingCountry) setShippingCountry(f.shippingCountry);
    if (f.shippingPhone) setShippingPhone(f.shippingPhone);
  } catch { /* ignore */ }
}, []);

const isBuyNowFlow = !!buyNowItem;

const checkoutItems = isBuyNowFlow
  ? [buyNowItem]
  : cart;
useEffect(() => {
  return () => {
    sessionStorage.removeItem("buyNowItem");
    setBuyNowItem(null); // 🔥 ADD THIS
  };
}, []);
useEffect(() => {
  console.log("CHECK ITEMS", checkoutItems);
}, [checkoutItems]);
const hasTrackedBeginCheckout = useRef(false);
useEffect(() => {
  if (!hasTrackedBeginCheckout.current && checkoutItems.length > 0) {
    hasTrackedBeginCheckout.current = true;
    trackBeginCheckout(checkoutItems);
  }
}, [checkoutItems]);
useEffect(() => {
  if (selectedShippingOption && checkoutItems.length > 0) {
    trackAddShippingInfo(
      checkoutItems,
      selectedShippingOption.displayName ?? selectedShippingOption.name ?? "Standard",
      selectedShippingOption.price ?? 0
    );
  }
}, [selectedShippingOption]);
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
  const allNextDayFree = useMemo(() =>
  checkoutItems.length > 0 &&
  checkoutItems.every(i => i.nextDayDeliveryFree === true),
  [checkoutItems]
);
const allSupportSameDay = useMemo(() =>
  checkoutItems.length > 0 && checkoutItems.every(i => i.sameDayDeliveryEnabled === true),
  [checkoutItems]);

const shippingCost = useMemo(() => {
  if (!selectedShippingOption) return 0;

  const isNextDay =
  selectedShippingOption?.name === "next-day";

  if (isNextDay && allNextDayFree) {
    return 0;
  }

  return selectedShippingOption.price ?? 0;
}, [selectedShippingOption, allNextDayFree]);

const cartTotalAmount = useMemo(() => {
  return (
    cartSubtotal -
    cartBundleDiscount -
    cartDiscount +
    shippingCost 
   
  );
}, [
  cartSubtotal,
  cartBundleDiscount,
  cartDiscount,
  shippingCost,
  
]);
const finalPayableAmount = cartTotalAmount - pointsDiscount;
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
  const postcode = (
    shippingSameAsBilling
      ? billingPostalCode
      : shippingPostalCode
  ).trim();

  // RESET
  if (!postcode) {
    setShippingOptions([]);
    setSelectedShippingOption(null);
    setShippingError("");
    return;
  }

  const cartValue = Math.max(
    0,
    checkoutItems.reduce(
      (s, i) =>
        s + (i.finalPrice ?? i.price) * i.quantity,
      0
    ) - cartBundleDiscount
  );

  const timer = setTimeout(async () => {
    try {
      setShippingQuoteLoading(true);
        setShippingError("");
     const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Shipping/quote?postcode=${encodeURIComponent(
          postcode
        )}&orderTotal=${cartValue}`
      );

      const text = await res.text();
      let json: any = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse shipping quote JSON:", e);
        }
      }

      // API ERROR
      if (!res.ok || json?.success === false) {
        setShippingOptions([]);
        setSelectedShippingOption(null);

        setShippingError(
          json?.message ||
            "Delivery is not available for this postcode."
        );

        return;
      }

      // VALID RESPONSE
      if (json?.success && Array.isArray(json.data)) {
        let options = json.data;

        // DELIVERY TYPE FILTER
        options = options.filter((opt: any) => {
          const name = (
            opt.name ||
            opt.displayName ||
            ""
          ).toLowerCase();

          const isCollect = name.includes("collect");

          if (deliveryMethod === "HomeDelivery") {
            return !isCollect;
          }

          if (deliveryMethod === "ClickAndCollect") {
            return isCollect;
          }

          return true;
        });

        // CAPABILITY FILTER
        options = options.filter((opt: any) => {
          const name = (
            opt.name ||
            opt.displayName ||
            ""
          ).toLowerCase();

          if (name.includes("next")) {
            return allSupportNextDay;
          }

          if (name.includes("same")) {
            return allSupportSameDay;
          }

          return true;
        });

        // SORT
        options.sort(
          (a: any, b: any) =>
            (a.displayOrder ?? 0) -
            (b.displayOrder ?? 0)
        );

        setShippingOptions(options);

        // AUTO SELECT
        if (options.length > 0) {
          setSelectedShippingOption(options[0]);
        } else {
          setSelectedShippingOption(null);

          setShippingError(
            "No delivery methods available for this postcode."
          );
        }
      } else {
        setShippingOptions([]);
        setSelectedShippingOption(null);

        setShippingError(
          "Unable to load delivery options."
        );
      }
    } catch (err) {
      console.error("Shipping quote fetch failed:", err);

      setShippingOptions([]);
      setSelectedShippingOption(null);

      setShippingError(
        "Unable to fetch delivery options."
      );
    } finally {
      setShippingQuoteLoading(false);
    }
  }, 600);

  return () => clearTimeout(timer);

}, [
  billingPostalCode,
  shippingPostalCode,
  shippingSameAsBilling,
  deliveryMethod,
  allSupportNextDay,
  allSupportSameDay,
  JSON.stringify(
    checkoutItems.map(i => ({
      id: i.id,
      qty: i.quantity
    }))
  ),
]);
useEffect(() => {
  if (deliveryMethod !== "ClickAndCollect") {
    setStores([]);
    setSelectedStoreId(null);
    return;
  }

const fetchStores = async () => {
  try {
    setStoreLoading(true);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/StoreLocations?includeInactive=false`
    );

    // ❌ अगर response hi fail ho gaya (500, 404 etc)
    if (!res.ok) {
      console.error("Store API failed with status:", res.status);
      setStores([]); // 👈 ADD THIS
      return;
    }

    // 🔥 SAFE parsing
    const text = await res.text();

    if (!text) {
      console.error("Empty StoreLocations response");
      setStores([]); // 👈 ADD THIS
      return;
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("Invalid JSON from StoreLocations:", text);
      setStores([]); // 👈 ADD THIS
      return;
    }

    // ✅ VALID DATA CHECK
    if (json?.success && Array.isArray(json.data)) {
      const activeStores = json.data.filter((s: any) => s.isActive === true);
      setStores(activeStores);
     if (activeStores.length > 0) {
  setSelectedStoreId((prev) => {
   const exists = activeStores.some((s: any) => s.id === prev);
    return exists ? prev : activeStores[0].id;
  });
}
    } else {
      console.error("Unexpected store response format:", json);
    }

  } catch (err) {
    console.error("Store fetch failed:", err);
  } finally {
    setStoreLoading(false);
  }
};

  fetchStores();
}, [deliveryMethod]);

useEffect(() => {
  if (!shippingOptions.length) return;

  const filteredOptions = shippingOptions.filter((opt: any) => {
    const name = (
      opt.displayName ||
      opt.name ||
      ""
    ).toLowerCase();

    const isStandard = name.includes("standard");

    if (allNextDayFree && isStandard) {
      return false;
    }

    return true;
  });

  // already valid selected
  const stillValid = filteredOptions.some(
    (o: any) =>
      o.deliveryOptionId ===
      selectedShippingOption?.deliveryOptionId
  );

  if (stillValid) return;

  // 🔥 auto select first available
  if (filteredOptions.length > 0) {
    setSelectedShippingOption(filteredOptions[0]);
  }
}, [
  shippingOptions,
  allNextDayFree,
  selectedShippingOption,
]);

// ✅ 🔥 YAHI ADD KARNA HAI (NEW EFFECT)
useEffect(() => {
  if (
    deliveryMethod === "ClickAndCollect" &&
    stores.length > 0 &&
    !stores.some(s => s.id === selectedStoreId)
  ) {
    setSelectedStoreId(stores[0].id);
  }
}, [stores, selectedStoreId, deliveryMethod]);
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
      `${process.env.NEXT_PUBLIC_API_URL}/api/address-lookup/search?query=${encodeURIComponent(q.trim())}&country=GB`
    );

    const text = await res.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse autocomplete JSON:", e);
      }
    }

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
const doShippingAutocomplete = useCallback(async (q: string) => {
  if (!q || q.trim().length < 3) {
    setShippingAddressSuggestions([]);
    setShowShippingSuggestions(false);
    return;
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/address-lookup/search?query=${encodeURIComponent(q.trim())}&country=GB`
    );

    const text = await res.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse shipping autocomplete JSON:", e);
      }
    }

    if (!json?.success || !Array.isArray(json.data)) {
      setShippingAddressSuggestions([]);
      setShowShippingSuggestions(false);
      return;
    }

    setShippingAddressSuggestions(json.data);
    setShowShippingSuggestions(json.data.length > 0);
  } catch (err) {
    console.error("Shipping address lookup failed", err);
    setShippingAddressSuggestions([]);
    setShowShippingSuggestions(false);
  }
}, []);
const fetchAddressDetails = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/address-lookup/details/${encodeURIComponent(
      id
    )}`
  );

  const text = await res.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse address details JSON:", e);
    }
  }

  if (!json?.success || !json?.data) {
    throw new Error("Failed to fetch address details");
  }
  return json.data;
};
 const debouncedAutocomplete = useDebouncedCallback(doAutocomplete, 350);
 const debouncedShippingAutocomplete = useDebouncedCallback(doShippingAutocomplete, 350);
useEffect(() => {
  debouncedAutocomplete(addressQuery);
}, [addressQuery, debouncedAutocomplete]);

useEffect(() => {
  debouncedShippingAutocomplete(shippingAddressQuery);
}, [shippingAddressQuery, debouncedShippingAutocomplete]);

useEffect(() => {
  if (!shippingSameAsBilling) return;
  setShippingFirstName(billingFirstName);
  setShippingLastName(billingLastName);
  setShippingPhone(billingPhone);
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
    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse newsletter JSON:", e);
      }
    }
    if (data?.success) {
      localStorage.setItem("newsletterEmail", email);
    }
  } catch (err) {
    console.error("Newsletter subscribe failed", err);
  }
}
  const getAppliedCouponCode = () => {
    const codes = checkoutItems
      .map((item) => item.couponCode?.trim())
      .filter((code): code is string => Boolean(code));

    return codes.length > 0 ? codes[0] : null;
  };

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
      collectionStoreId:
          deliveryMethod === "ClickAndCollect"
          ? selectedStoreId
          : null,    
      paymentMethod: "Card",
      customerEmail: billingEmail,
      customerPhone: `+44${billingPhone}`,
      billingPhone: `+44${billingPhone}`, 
      shippingPhone: `+44${shippingSameAsBilling ? billingPhone : shippingPhone}`,
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
      couponCode: getAppliedCouponCode(),
    // ✅ ADD THIS
selectedShippingMethodId:
  selectedShippingOption?.deliveryOptionId ?? null,

selectedShippingMethodName:
  selectedShippingOption?.displayName ||
  selectedShippingOption?.name ||
  null,
     
     shippingCost: selectedShippingOption?.price ?? 0,
      notes,
      pointsToRedeem: pointsToRedeem || 0,
pointsDiscountAmount: pointsDiscount || 0,
      // Marketing attribution (gclid / utm / referrer captured on landing)
      ...getAttributionPayload(),
    };
  };
const validateAndBuildPayload = async (): Promise<any | null> => {
  setError(null);
  setFieldErrors({});
  const errors: any = {};

  // Email validation
  if (!billingEmail.trim()) {
    errors.billingEmail = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
    errors.billingEmail = "Enter a valid email address";
  }

  // First name validation
  if (!billingFirstName.trim()) {
    errors.billingFirstName = "First name is required";
  }

  // ✅ Billing Phone validation - Combined (Fixed)
  if (!billingPhone.trim()) {
    errors.billingPhone = "Phone number is required";
  } else if (billingPhone.trim().length !== 10) {
    errors.billingPhone = "Phone number must be exactly 10 digits";
  }

  // ✅ Shipping Phone validation (when not same as billing) - Fixed
  if (!shippingSameAsBilling) {
    if (!shippingPhone.trim()) {
      errors.shippingPhone = "Shipping phone number is required";
    } else if (shippingPhone.trim().length !== 10) {
      errors.shippingPhone = "Shipping phone number must be exactly 10 digits";
    }
  }

  // HomeDelivery validation
  if (deliveryMethod === "HomeDelivery") {
    if (!billingAddress1.trim()) {
      errors.billingAddress1 = "Address line 1 is required";
    }
    if (!(billingPostalCode ?? "").trim()) {
      errors.billingPostalCode = "Postcode is required";
    }
    if (!billingCity.trim()) {
      errors.billingCity = "City is required";
    }
    if (!billingCountry.trim()) {
      errors.billingCountry = "Country is required";
    }

    // Shipping fields validation (when not same as billing)
    if (!shippingSameAsBilling) {
      if (!shippingFirstName.trim()) {
        errors.shippingFirstName = "Shipping first name is required";
      }
      // ✅ Remove duplicate shipping phone validation (already handled above)
      if (!shippingAddress1.trim()) {
        errors.shippingAddress1 = "Shipping address line 1 is required";
      }
      if (!shippingPostalCode.trim()) {
        errors.shippingPostalCode = "Shipping postcode is required";
      }
      if (!shippingCity.trim()) {
        errors.shippingCity = "Shipping city is required";
      }
      if (!shippingCountry.trim()) {
        errors.shippingCountry = "Shipping country is required";
      }
    }
  }

  // Click & Collect validation
  if (deliveryMethod === "ClickAndCollect" && !selectedStoreId) {
    errors.selectedStore = "Please select a store";
  }

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    setError("Please fill all required fields");
    return null;
  }

  // Build a canonical frequency string the backend understands:
  // numeric interval → "every-30-days"; named → "weekly"/"monthly" as-is.
  const toCanonicalFrequency = (freq: any, period: any): string => {
    const p = String(period ?? "").toLowerCase().trim();
    const n = Number(freq);
    if (!isNaN(n) && n > 0 && /^(day|days|week|weeks|month|months|year|years)$/.test(p)) {
      const unit = p.endsWith("s") ? p : p + "s";
      return `every-${n}-${unit}`;
    }
    if (p && p !== "nan") return p;
    const f = String(freq ?? "").toLowerCase().trim();
    return f && f !== "nan" ? f : "monthly";
  };

  // 🔁 subscription logic
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
            frequency: toCanonicalFrequency(item.frequency, item.frequencyPeriod),
            shippingFirstName: shippingSameAsBilling ? billingFirstName : shippingFirstName,
            shippingLastName: shippingSameAsBilling ? billingLastName : shippingLastName,
            shippingPhone: `+44${shippingSameAsBilling ? billingPhone : shippingPhone}`,
            shippingAddressLine1: shippingSameAsBilling ? billingAddress1 : shippingAddress1,
            shippingAddressLine2: shippingSameAsBilling ? billingAddress2 : shippingAddress2,
            shippingCity: shippingSameAsBilling ? billingCity : shippingCity,
            shippingState: shippingSameAsBilling ? billingState : shippingState,
            shippingPostalCode: shippingSameAsBilling ? billingPostalCode : shippingPostalCode,
            shippingCountry: shippingSameAsBilling ? billingCountry : shippingCountry,
          }),
        });
        if (resp.ok) {
          const text = await resp.text();
          let json: any = null;
          if (text) {
            try {
              json = JSON.parse(text);
            } catch (e) {
              console.error("Failed to parse subscription JSON:", e);
            }
          }
          if (json?.data?.id) subscriptionMap[item.id] = json.data.id;
        }
      } catch {
        setError("Subscription setup failed. Try again.");
        return null;
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

  return payload; // COD flow ke liye
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
  
  if (isBuyNowFlow) {
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
  // Payment done — clear the resume-payment markers.
  localStorage.removeItem("pending_order");
  localStorage.removeItem("checkout_form");
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
    onChange={(e) => {
  const cleaned = e.target.value.replace(/\D/g, "");
  setBillingPhone(cleaned);

  setFieldErrors((prev) => ({
    ...prev,
    billingPhone:
      cleaned.length === 0
        ? "Phone number is required"
        : cleaned.length < 10
        ? "10 digits are required"
        : "",
  }));
}}
      placeholder="7xxxxxxxxx"
      className="w-full border border-gray-300 p-1.5 text-sm rounded-r focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
      maxLength={10}
    />
  </div>
  <ErrorText error={fieldErrors.billingPhone} />
</div>
<div className="flex flex-col space-y-0.5 col-span-2">
  <label className="text-xs font-medium text-gray-700">Company Name (optional)</label>
  <input
    value={billingCompany}
    onChange={(e) => setBillingCompany(e.target.value)}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
  />
</div>
{/* <div className="flex flex-col space-y-0.5 col-span-2 relative z-[40]">
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
</div> */}
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
  <label className="text-xs font-medium text-gray-700">Country *</label>
  <input
    value={billingCountry}
    onChange={(e) => { setBillingCountry(e.target.value); clearFieldError("billingCountry"); }}
    className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all bg-gray-100 cursor-not-allowed"
    disabled
  />
  <ErrorText error={fieldErrors.billingCountry} />
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
    // fill shipping with billing
    setShippingFirstName(billingFirstName);
    setShippingLastName(billingLastName);
    setShippingPhone(billingPhone);
    setShippingCompany(billingCompany);
    setShippingAddress1(billingAddress1);
    setShippingAddress2(billingAddress2);
    setShippingCity(billingCity);
    setShippingState(billingState);
    setShippingPostalCode(billingPostalCode);
    setShippingCountry(billingCountry);
  } else {
    // 🔥 CLEAR SHIPPING FORM
    setShippingFirstName("");
    setShippingLastName("");
    setShippingPhone("");
    setShippingCompany("");
    setShippingAddress1("");
    setShippingAddress2("");
    setShippingCity("");
    setShippingState("");
    setShippingPostalCode("");
    setShippingCountry("United Kingdom");
  }
}}
  type="checkbox"
/>
      <label htmlFor="same" className="text-s">Shipping same as billing</label>
    </div>
    {!shippingSameAsBilling ? (
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col space-y-0.5 mt-2 col-span-2 relative z-[40]">
  <label className="text-xs font-medium text-gray-700">
    Search shipping address or postcode
  </label>

  <input
    type="text"
   value={shippingAddressQuery}
onChange={(e) => setShippingAddressQuery(e.target.value)}
    placeholder="Start typing city, postcode or address..."
    className="w-full border p-1.5 text-sm rounded"
  />

  {showShippingSuggestions && shippingAddressSuggestions.length > 0 && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded max-h-48 overflow-auto shadow-lg z-[40]">
     {shippingAddressSuggestions.map((s) => (
        <button
          key={s.id}
          onClick={async () => {
            try {
              const details = await fetchAddressDetails(s.id);

              const line1 =
                details.line1 ||
                details.line2 ||
                details.line3 ||
                s.text ||
                "";

              const city =
                details.city ||
                details.town ||
                details.locality ||
                details.administrativeArea ||
                "";

              const state = details.province || "";
              const postcode = details.postalCode || "";
              const country = details.country || "United Kingdom";

              setShippingAddress1(line1);
              setShippingCity(city);
              setShippingState(state);
              setShippingPostalCode(postcode);
              setShippingCountry(country);

             setShowShippingSuggestions(false);
              setShippingAddressSuggestions([]);
              setShippingAddressQuery("");
            } catch (err) {
              console.error("Shipping address lookup error", err);
            }
          }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          {s.text}
        </button>
      ))}
    </div>
  )}
</div>
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
  <label className="text-xs font-medium text-gray-700">Phone (UK) *</label>
  <div className="flex">
    <span className="flex items-center bg-gray-100 border border-r-0 border-gray-300 px-2 rounded-l text-xs text-gray-700">
      +44
    </span>
    <input
      type="tel"
      value={shippingPhone}
      onChange={(e) => {
  const cleaned = e.target.value.replace(/\D/g, "");
  setShippingPhone(cleaned);

  setFieldErrors((prev) => ({
    ...prev,
    shippingPhone:
      cleaned.length === 0
        ? "Phone number is required"
        : cleaned.length < 10
        ? "10 digits are required"
        : "",
  }));
}}
      placeholder="7xxxxxxxxx"
      className="w-full border border-gray-300 p-1.5 text-sm rounded-r focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all"
      maxLength={10}
    />
  </div>
  <ErrorText error={fieldErrors.shippingPhone} />
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
          <label className="text-xs font-medium text-gray-700">Country *</label>
          <input
            value={shippingCountry}
            onChange={(e) => { setShippingCountry(e.target.value); clearFieldError("shippingCountry"); }}
            className="w-full border border-gray-300 p-1.5 text-sm rounded focus:ring-2 focus:ring-[#445D41]/20 focus:border-[#445D41] transition-all bg-gray-100 cursor-not-allowed"
            disabled
          />
          <ErrorText error={fieldErrors.shippingCountry} />
        </div>

      </div>
        
    ) : (
      <div className="text-xs text-gray-600">Shipping will use billing address.</div>
    )}
</div>
)}

{shippingError && (
  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
    {shippingError}
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

{deliveryMethod === "ClickAndCollect" && (
  <div className="bg-white p-3 rounded shadow">
    <h2 className="text-sm font-semibold mb-2">Select Store</h2>

    {storeLoading ? (
      <p className="text-xs text-gray-500">Loading stores...</p>
    ) : stores.length === 0 ? (
      <p className="text-xs text-gray-400">No stores available</p>
    ) : (
      <div className="flex flex-col gap-2">
        {stores.map((store) => (
     <label
  key={store.id}
  className={`border rounded-lg p-3 cursor-pointer transition-all ${
    selectedStoreId === store.id
      ? "border-[#445D41] bg-[#445D41]/5"
      : "border-gray-200"
  }`}
>
  <div className="flex items-start gap-3">
    <input
      type="radio"
      name="store"
      checked={selectedStoreId === store.id}
      onChange={() => setSelectedStoreId(store.id)}
      className="mt-1 shrink-0"
    />

    <div className="flex-1">
      <p className="text-sm font-semibold leading-none">
        {store.name}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        {store.addressLine1}, {store.city}, {store.postalCode}
      </p>

      {store.openingHours && (
        <p className="text-[11px] text-gray-400 mt-1">
          {store.openingHours}
        </p>
      )}
    </div>
  </div>
</label>
        ))}
      </div>
    )}
  </div>
)}

{/* SHIPPING OPTIONS */}
{deliveryMethod === "HomeDelivery" && shippingOptions.length > 0 && (
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
     {shippingOptions
  .filter((opt: any) => {
    const name = (
      opt.displayName ||
      opt.name ||
      ""
    ).toLowerCase();

    const isStandard =
      name.includes("standard");

    // 🔥 if next day is FREE then hide standard
    if (allNextDayFree && isStandard) {
      return false;
    }

    return true;
  })
  .map((opt: any) => (
          <label
           key={opt.deliveryOptionId}
            className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
             selectedShippingOption?.deliveryOptionId === opt.deliveryOptionId
                ? "border-[#445D41] bg-[#445D41]/5"
                : "border-gray-200 hover:border-[#445D41]/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="radio"
                name="shippingOption"
             checked={selectedShippingOption?.deliveryOptionId === opt.deliveryOptionId}
                onChange={() => setSelectedShippingOption(opt)}
                className="accent-[#445D41]"
              />
              <div>
                <p className="text-xs font-semibold text-gray-800">{opt.displayName}</p>
                {opt.estimatedDelivery && (
                  <p className="text-[11px] text-gray-500">{opt.estimatedDelivery}</p>
                )}
              </div>
            </div>
            <span className={`text-xs font-bold shrink-0 ${opt.isFree ? "text-green-600" : "text-gray-800"}`}>
            {(() => {
const isNextDay =
  opt.name === "next-day";
  if (isNextDay && allNextDayFree) return "FREE";

  return opt.isFree ? "FREE" : `£${Number(opt.price).toFixed(2)}`;
})()}
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
             {checkoutItems.map((it) => {
  const productSlug =
    it.productData?.slug ||
    it.slug ||
    it.productSlug ||
    "";

  return (
    <Link
      key={it.id + (it.variantId || "")}
      href={`/product/${productSlug}`}
      className="flex gap-2 items-start group"
    >
      <img
        src={it.image}
        alt={"no img"}
        className="w-12 h-12 object-cover rounded flex-shrink-0"
      />

      <div className="flex-1">
        <div className="font-medium text-sm text-[#445D41] hover:text-black transition">
          {it.productData?.productType === "variable" ? it.name : (it.productData?.name ?? it.name)}
        </div>

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
      </div>
    </Link>
  );
})}             
            </div>           
            <div className="border-t pt-3">
              {totalLoyaltyPoints > 0 && (
  <div className="mt-2 flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
    <span className="flex items-center gap-2 text-green-700 font-medium">
  <Gift size={16} className="text-green-600" />
  Total Loyalty points
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
    <span className="text-gray-600">Subtotal (Incl. VAT)</span>
    <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
  </div>
  <div className="flex items-center justify-between border-t pt-2 mt-2 text-sm text-gray-700">
  <span>VAT</span>
  <span>{formatCurrency(checkoutVatAmount)}</span>
</div>
{deliveryMethod === "ClickAndCollect" && selectedShippingOption && (
  <div className="flex items-center justify-between text-sm text-gray-700">
    <span className="font-medium">
      {selectedShippingOption.displayName}
    </span>
    <span className={`font-semibold ${shippingCost === 0 ? "text-green-600" : ""}`}>
      {shippingCost === 0 ? "FREE" : `+ ${formatCurrency(shippingCost)}`}
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
    <span className={`font-semibold ${shippingCost === 0 ? "text-green-600" : ""}`}>
     {(() => {
  const isNextDay =
  selectedShippingOption?.name === "next-day";
  if (isNextDay && allNextDayFree) return "FREE";

 return shippingCost === 0
  ? "FREE"
  : `+ ${formatCurrency(shippingCost)}`;
})()}
    </span>
  </div>
)}
{pointsDiscount > 0 && (
  <div className="flex items-center justify-between text-green-700 text-xs">
    <span>Points Discount ({pointsToRedeem} pts)</span>
    <span>- {formatCurrency(pointsDiscount)}</span>
  </div>
)}
  {/* Divider + Total */}
  <div className="border-t pt-2 mt-1 flex items-center justify-between">
    <span className="text-sm font-semibold text-gray-900">Total</span>
    <span className="text-sm font-bold text-gray-900">
     {formatCurrency(finalPayableAmount)}
    </span>
  </div>
</div>
<LoyaltyRedemptionBox
  orderTotal={cartTotalAmount}
  onApply={(pts, discount) => {
    setPointsToRedeem(pts);
    setPointsDiscount(discount);
  }}
  onRemove={() => {
    setPointsToRedeem(0);
    setPointsDiscount(0);
  }}
/>
{error && (
  <div className="mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
    {error}
  </div>
)}
              <div className="mt-2">
                  <>
                    {/* Payment method selector */}
                    <div className="mb-2">
  <label className="text-xs font-semibold block mb-1.5">
    Payment
  </label>
</div>

{/* STEP 1 */}
{!stripeClientSecret && (
  <button
    title={
      shippingError
        ? shippingError
        : !acceptTerms
        ? "Please accept Terms & Conditions"
        : deliveryMethod === "HomeDelivery" &&
  !(billingPostalCode ?? "").trim()
? "Please enter postcode"
        : ""
    }
    disabled={
      isPlacing ||
      (!!shippingError &&
        deliveryMethod === "HomeDelivery") ||
     !acceptTerms ||(
  deliveryMethod === "HomeDelivery" &&
  !(billingPostalCode ?? "").trim()
)
    }
    onClick={async () => {
      if (!acceptTerms) {
        setTermsError(
          "Please accept Terms & Conditions"
        );
        return;
      }

      if (isPlacing) return;

      setIsPlacing(true);

      const payload = await validateAndBuildPayload();

      if (!payload) {
        setIsPlacing(false);
        return;
      }

      try {
        const orderResp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/Orders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(isAuthenticated && {
                Authorization: `Bearer ${accessToken}`,
              }),
            },
            body: JSON.stringify(payload),
          }
        );

        const orderText = await orderResp.text();

        let orderJson: any = null;

        if (orderText) {
          try {
            orderJson = JSON.parse(orderText);
          } catch (e) {
            console.error(
              "Failed to parse order JSON:",
              e
            );
          }
        }

        if (!orderResp.ok) {
          const errMsg = orderJson?.message || "Order creation failed";
          setError(errMsg);
          if (errMsg.toLowerCase().includes("cannot be purchased together")) {
            toast.error(errMsg);
          }
          setIsPlacing(false);
          return;
        }

        if (!orderJson?.data?.id) {
          setError("Invalid order response");
          setIsPlacing(false);
          return;
        }

        const orderId = orderJson.data.id;

        const totalAmount =
          orderJson.data.totalAmount;

        // PAYMENT INTENT
        const intentResp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/Payment/create-intent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: totalAmount,
              currency: "GBP",
              customerEmail: billingEmail,
              orderId,
            }),
          }
        );

        const intentText =
          await intentResp.text();

        let intentJson: any = null;

        if (intentText) {
          try {
            intentJson = JSON.parse(intentText);
          } catch (e) {
            console.error(
              "Failed to parse intent JSON:",
              e
            );
          }
        }

        if (!intentResp.ok) {
          setError(
            intentJson?.message ||
              "Payment initialization failed"
          );

          setIsPlacing(false);
          return;
        }

        if (!intentJson?.data?.clientSecret) {
          setError(
            "Payment initialization failed"
          );

          setIsPlacing(false);
          return;
        }

        setStripeOrderId(orderId);

        setStripeClientSecret(
          intentJson.data.clientSecret
        );

        // Remember this Pending order so the customer can resume payment if they
        // navigate away before paying (Approach B — works for guest & logged-in).
        try {
          localStorage.setItem("pending_order", JSON.stringify({
            orderId,
            orderNumber: orderJson.data.orderNumber,
            email: billingEmail,
            total: totalAmount,
            ts: Date.now(),
          }));
          // Also remember the details the customer typed so the checkout form is
          // pre-filled if they come back (they don't have to re-enter everything).
          localStorage.setItem("checkout_form", JSON.stringify({
            billingFirstName, billingLastName, billingEmail, billingPhone, billingCompany,
            billingAddress1, billingAddress2, billingCity, billingState, billingPostalCode, billingCountry,
            deliveryMethod, shippingSameAsBilling,
            shippingFirstName, shippingLastName, shippingCompany,
            shippingAddress1, shippingAddress2, shippingCity, shippingState, shippingPostalCode, shippingCountry, shippingPhone,
          }));
        } catch { /* storage blocked — ignore */ }

        trackAddPaymentInfo(
          checkoutItems,
          "stripe"
        );
      } catch (err: any) {
        console.error(
          "Checkout order placement failed:",
          err
        );

        const errMsg = err?.message || "Order placement failed. Please check your network and try again.";
        setError(errMsg);
        if (errMsg.toLowerCase().includes("cannot be purchased together")) {
          toast.error(errMsg);
        }
      } finally {
        setIsPlacing(false);
      }
    }}
    className={`w-full py-2 text-sm rounded transition flex items-center justify-center gap-2 ${
      isPlacing ||
      (!!shippingError &&
        deliveryMethod === "HomeDelivery") ||
     !acceptTerms ||(
  deliveryMethod === "HomeDelivery" &&
  !(billingPostalCode ?? "").trim()
)
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-[#445D41] hover:bg-[#3a5037] text-white"
    }`}
  >
    {isPlacing ? (
      <>
        <svg
          className="animate-spin h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />

          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>

        Preparing payment
      </>
    ) : (
      "Continue to payment"
    )}
  </button>
)}

{/* STEP 2 */}
{stripeClientSecret && stripeOrderId && (
  <StripeWrapper clientSecret={stripeClientSecret}>
    <CheckoutPayment
      clientSecret={stripeClientSecret}
      orderId={stripeOrderId}
      payAmount={finalPayableAmount}
      orderPayload={{
        billingFirstName,
        billingLastName,
        customerEmail: billingEmail,
        billingAddressLine1: billingAddress1,
      }}
      onPaymentSuccess={onPaymentSuccess}
      onError={onPaymentError}
    />
  </StripeWrapper>
)}
        

                  
                  </>          
              </div>
              {termsError && (
  <div className="mt-1 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md px-3 py-2">
    {termsError}
  </div>
)}
             {/* Terms & Newsletter */}
<div className="mt-2 space-y-1.5">
  <label className="flex items-start gap-2 text-xs text-gray-700">
    <input
  type="checkbox"
  checked={acceptTerms}
  onChange={(e) => {
    setAcceptTerms(e.target.checked);

    if (e.target.checked) {
      setTermsError("");
    }
  }}
  className="mt-0.5"
/>

    <span>I agree to the <Link href="/terms-and-conditions" className="text-blue-600 underline">Terms & Conditions</Link></span>
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
