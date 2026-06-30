"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement?: (element: HTMLElement, force?: boolean) => void;
    };
  }
}

type TrustpilotWidgetProps = {
  className?: string;
  title?: string;
  height?: string;
  showLabel?: boolean;
};

export default function TrustpilotWidget({
  className = "",
  title = "Trustpilot reviews",
  height = "52px",
  showLabel = false,
}: TrustpilotWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const tryLoad = () => {
      const el = widgetRef.current;
      if (!el) return;

      if (window.Trustpilot?.loadFromElement) {
        window.Trustpilot.loadFromElement(el, true);
        return true;
      }

      return false;
    };

    if (tryLoad()) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryLoad() || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`trustpilot-slot ${className}`} aria-label={title}>
      {showLabel && (
        <span className="mr-2 text-[10px] uppercase tracking-[0.2em] text-[#445D41] font-semibold whitespace-nowrap">
          Reviews
        </span>
      )}
      <div
        ref={widgetRef}
        className="trustpilot-widget"
        data-locale="en-US"
        data-template-id="56278e9abfbbba0bdcd568bc"
        data-businessunit-id="6870b783dd0a4c4d3e40416e"
        data-style-height={height}
        data-style-width="100%"
        data-token="3ad7ff4b-423c-4e30-a7e1-d379d65868f2"
      >
        <a
          href="https://www.trustpilot.com/review/www.direct-care.co.uk"
          target="_blank"
          rel="noopener noreferrer"
        >
          Trustpilot
        </a>
      </div>
    </div>
  );
}
