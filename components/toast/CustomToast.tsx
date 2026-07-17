"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

/* ================= TYPES ================= */
type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: ReactNode;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  success: (msg: ReactNode, duration?: number) => void;
  error: (msg: ReactNode, duration?: number) => void;
  info: (msg: ReactNode, duration?: number) => void;
  warning: (msg: ReactNode, duration?: number) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/* ================= STYLES ================= */
const toastStyles: Record<ToastType, string> = {
  success:
    "bg-green-700 text-white",
  error:
    "bg-gradient-to-r from-red-600 to-red-700 text-white",
  info:
    "bg-violet-500 text-white border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.5)] relative overflow-hidden",
  warning:
    "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black",
};

const toastIcons: Record<ToastType, any> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

/* ================= TOAST ITEM ================= */
const ToastItem = ({
  toast,
  onRemove,
  isReplacing = false, // 🔥 NEW - For replacement animation
}: {
  toast: Toast;
  onRemove: (id: string) => void;
  isReplacing?: boolean;
}) => {
  const Icon = toastIcons[toast.type];

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(toast.duration);
  const [isVisible, setIsVisible] = useState(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    startTimeRef.current = Date.now();
    clearTimer();

    timerRef.current = setTimeout(() => {
      onRemove(toast.id);
    }, remainingRef.current);
  };

  useEffect(() => {
    // 🔥 ENTER ANIMATION - Slight delay for smooth replacement
    const enterDelay = isReplacing ? 150 : 50;
    const enterTimer = setTimeout(() => {
      setIsVisible(true);
    }, enterDelay);

    startTimer();
    
    return () => {
      clearTimer();
      clearTimeout(enterTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = () => {
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(
      remainingRef.current - elapsed,
      0
    );
    clearTimer();
  };

  const handleMouseLeave = () => {
    if (remainingRef.current > 0) {
      startTimer();
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl 
        min-w-[320px] max-w-[420px] 
        shadow-[0_12px_30px_rgba(0,0,0,0.18)] 
        backdrop-blur-md border border-white/20 
        text-sm font-medium 
        ${toastStyles[toast.type]}
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 -translate-y-4 scale-95'
        }
        ${isReplacing 
          ? 'animate-[pulse_0.5s_ease-in-out] ring-2 ring-white/30' 
          : ''
        }
      `}
      style={{
        transformOrigin: 'top center',
      }}
    >
      {/* ICON */}
      <Icon className="w-4 h-4 shrink-0 text-gray-300" />

      {/* MESSAGE */}
      <div className="flex-1 leading-snug">
        {toast.message}
      </div>

      {/* CLOSE */}
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 rounded-full p-1 opacity-60 hover:opacity-100 hover:bg-white/20 transition"
        aria-label="Close toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ================= PROVIDER - SINGLE TOAST PER TYPE ================= */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [topOffset, setTopOffset] = useState(120);
  const [mounted, setMounted] = useState(false);
  const prevToastsRef = useRef<Toast[]>([]);

  useEffect(() => {
    setMounted(true);
    const header = document.getElementById("main-header");
    if (!header) return;

    const updateOffset = () => {
      setTopOffset(header.offsetHeight);
    };

    updateOffset();

    const observer = new ResizeObserver(() => {
      updateOffset();
    });

    observer.observe(header);

    return () => {
      observer.disconnect();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const removeAllToasts = () => {
    setToasts([]);
  };

  const showToast = (
    message: ReactNode,
    type: ToastType,
    duration = 1500 // 🔥 DEFAULT 1.5 SECONDS
  ) => {
    const id = crypto.randomUUID();
    
    // 🔥 TRACK IF REPLACING
    const prevOfSameType = toasts.find((t) => t.type === type);
    const isReplacing = !!prevOfSameType;

    // 🔥 REPLACE: Remove existing toast of SAME type, then add new
    setToasts((prev) => {
      const filtered = prev.filter((t) => t.type !== type);
      return [...filtered, { id, message, type, duration }];
    });

    // 🔥 Store for animation detection
    prevToastsRef.current = toasts;
  };

  const value: ToastContextType = {
    success: (msg, d) => showToast(msg, "success", d ?? 1500),
    error: (msg, d) => showToast(msg, "error", d ?? 1500),
    info: (msg, d) => showToast(msg, "info", d ?? 1500),
    warning: (msg, d) => showToast(msg, "warning", d ?? 1500),
    clearAll: removeAllToasts,
  };

  // 🔥 GROUP TOASTS BY TYPE - ONLY LATEST PER TYPE
  const successToast = toasts.filter((t) => t.type === "success").slice(-1);
  const errorToast = toasts.filter((t) => t.type === "error").slice(-1);
  const warningToast = toasts.filter((t) => t.type === "warning").slice(-1);
  const infoToasts = toasts.filter((t) => t.type === "info").slice(-1);

  // 🔥 Check if this toast is a replacement
  const isReplacingToast = (toast: Toast) => {
    return prevToastsRef.current.some((t) => t.type === toast.type && t.id !== toast.id);
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Only render toasts on the client to avoid SSR hydration mismatches */}
      {mounted && (
        <>
          {/* ===== TOP TOASTS (SUCCESS / ERROR / WARNING - ONLY ONE EACH) ===== */}
          <div
            style={{ top: `${topOffset}px` }}
            className="fixed left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3"
          >
            {successToast.map((toast) => (
              <ToastItem 
                key={toast.id} 
                toast={toast} 
                onRemove={removeToast}
                isReplacing={isReplacingToast(toast)}
              />
            ))}
            {errorToast.map((toast) => (
              <ToastItem 
                key={toast.id} 
                toast={toast} 
                onRemove={removeToast}
                isReplacing={isReplacingToast(toast)}
              />
            ))}
            {warningToast.map((toast) => (
              <ToastItem 
                key={toast.id} 
                toast={toast} 
                onRemove={removeToast}
                isReplacing={isReplacingToast(toast)}
              />
            ))}
          </div>

          {/* ===== INFO TOAST (BOTTOM RIGHT - ONLY ONE) ===== */}
          <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-3">
            {infoToasts.map((toast) => (
              <ToastItem 
                key={toast.id} 
                toast={toast} 
                onRemove={removeToast}
                isReplacing={isReplacingToast(toast)}
              />
            ))}
          </div>
        </>
      )}
    </ToastContext.Provider>
  );
};

/* ================= HOOK ================= */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
};