"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Bell } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  variantId?: string | null;
}

export default function BackInStockModal({
  open,
  onClose,
  productId,
  variantId,
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

 

  if (!open) return null;

  const submit = async () => {
    if (!email) {
      setError("Please enter email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/back-in-stock-subscription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: email,
            productVariantId: variantId ?? null,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Subscription failed");
      }

      setMessage("You'll be notified when back in stock ✅");

      setTimeout(() => {
        onClose();
        setMessage(null);
        setEmail("");
      }, 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"

    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >


        {/* 🔥 HEADER: Bell Icon + Title INLINE */}
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-full bg-[#445D41]/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4.5 h-4.5 text-[#445D41]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Notify when available
          </h3>
        </div>

        <p className="text-xs text-gray-500 text-center mb-4">
          Enter your email to get notified when back in stock.
        </p>

        <input
          type="email"
          placeholder="Enter your email"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-transparent transition mb-2"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          autoFocus
        />

        {error && (
          <p className="text-xs text-red-600 mb-2 text-center">{error}</p>
        )}
        {message && (
          <p className="text-xs text-green-600 mb-2 text-center">{message}</p>
        )}

        {/* 🔥 BUTTONS INLINE (SIDE BY SIDE) */}
        <div className="flex gap-2">
          <Button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-[#445D41] hover:bg-black text-white font-semibold text-sm transition disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting...
              </span>
            ) : (
              "Notify Me"
            )}
          </Button>

          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}