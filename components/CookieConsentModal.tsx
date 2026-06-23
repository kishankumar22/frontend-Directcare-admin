"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Info, X } from "lucide-react";

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if the user has already made a choice
    const consent = localStorage.getItem("cookie-consent-accepted");
    if (!consent) {
      // Delay slightly for a smoother UX after page load
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookie-consent-accepted", "all");
    setShowConsent(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem("cookie-consent-accepted", "essential");
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-5 md:p-6 relative overflow-hidden">
        {/* Accent line */}
        <div className="absolute top-0 left-0 h-[4px] w-full bg-gradient-to-r from-[#445D41] via-[#5E7B5A] to-[#445D41]" />
        
        {/* Header */}
        <div className="flex items-start gap-3 mt-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#445D41] to-[#2A3F28] flex items-center justify-center shrink-0 shadow-md shadow-[#445D41]/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 leading-snug">
              Cookie Consent
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              We value your privacy
            </p>
          </div>
          <button 
            onClick={handleAcceptEssential} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1 rounded-lg hover:bg-gray-100"
            title="Accept essential only and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="mt-3 text-[13px] leading-relaxed text-gray-600">
          <p>
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking &ldquo;Accept All&rdquo;, you consent to our use of cookies. Read our{" "}
            <a href="/privacy-policy" className="text-[#445D41] hover:underline font-semibold">
              Privacy Policy
            </a>{" "}
            for more details.
          </p>
        </div>

        {/* Info box */}
        <div className="mt-4 flex items-start gap-2 bg-[#F3F6F3] border border-green-100 rounded-xl p-3">
          <Info className="w-4 h-4 text-[#445D41] shrink-0 mt-0.5" />
          <span className="text-[11px] leading-normal text-gray-600">
            Essential cookies are always enabled to ensure the website functions correctly.
          </span>
        </div>

        {/* Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleAcceptEssential}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all duration-200 border border-gray-200/50"
          >
            Reject Non-Essential
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#445D41] to-[#2A3F28] hover:from-[#354932] hover:to-[#1F2F1E] text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
