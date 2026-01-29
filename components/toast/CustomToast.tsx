"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
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
}

const ToastContext = createContext<ToastContextType | null>(null);

/* ================= STYLES ================= */
const toastStyles: Record<ToastType, string> = {
  success:
    "bg-gradient-to-r from-black via-[#445D41] to-black text-white",
  error:
    "bg-gradient-to-r from-red-600 to-red-700 text-white",
  info:
    "bg-gradient-to-r from-gray-900 to-gray-800 text-white",
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
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) => {
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={` flex items-center gap-3 px-4 py-3 rounded-xl min-w-[320px] max-w-[420px] shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-md border border-white/20 text-sm font-medium animate-toastIn ${toastStyles[toast.type]} `} >
      {/* ICON */}
      <Icon className="w-5 h-5 shrink-0 opacity-90" />

      {/* MESSAGE */}
      <div className="flex-1 leading-snug">
        {toast.message}
      </div>

      {/* CLOSE */}
      <button
        onClick={() => onRemove(toast.id)}
        className=" ml-1 rounded-full p-1 opacity-60 hover:opacity-100 hover:bg-white/20 transition " aria-label="Close toast" >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/* ================= PROVIDER ================= */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (
    message: ReactNode,
    type: ToastType,
    duration = 2200
  ) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const value: ToastContextType = {
    success: (msg, d) => showToast(msg, "success", d),
    error: (msg, d) => showToast(msg, "error", d),
    info: (msg, d) => showToast(msg, "info", d),
    warning: (msg, d) => showToast(msg, "warning", d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* ===== POSITION SAME (HEADER KE NICHE) ===== */}
      <div className="fixed top-[153px] left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
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
