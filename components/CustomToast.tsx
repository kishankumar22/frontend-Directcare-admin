// components/CustomToast.tsx
"use client";

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle,
  X 
} from 'lucide-react';

// === Types ===
interface ToastProps {
  id: string;
  message: string | ReactNode;
  type?: 'success' | 'error' | 'info' | 'warning';
  autoClose?: number;
  onClose: (id: string) => void;
  pauseOnHover?: boolean;
  draggable?: boolean;
  hideProgressBar?: boolean;
  closeButton?: boolean;
}

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  autoClose?: number;
  pauseOnHover?: boolean;
  draggable?: boolean;
  hideProgressBar?: boolean;
  closeButton?: boolean;
}

interface ToastContextType {
  toasts: any[];
  toast: {
    success: (message: string | ReactNode, options?: ToastOptions) => string;
    error: (message: string | ReactNode, options?: ToastOptions) => string;
    info: (message: string | ReactNode, options?: ToastOptions) => string;
    warning: (message: string | ReactNode, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    isActive: (id: string) => boolean;
    show: (message: string | ReactNode, options?: ToastOptions) => string;
  };
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastContainerProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  autoClose?: number;
  hideProgressBar?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  closeButton?: boolean;
  limit?: number;
}

// === Toast Types ===
const TOAST_TYPES = {
  success: { bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800', iconColor: 'text-green-500', progressColor: 'bg-green-500', icon: CheckCircle },
  error: { bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-800', iconColor: 'text-red-500', progressColor: 'bg-red-500', icon: XCircle },
  info: { bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800', iconColor: 'text-blue-500', progressColor: 'bg-blue-500', icon: Info },
  warning: { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-800', iconColor: 'text-yellow-500', progressColor: 'bg-yellow-500', icon: AlertTriangle }
};

// === Context ===
const ToastContext = createContext<ToastContextType | null>(null);

// === Toast Component ===
// === Toast Component (UPDATED - Better UI) ===
const Toast: React.FC<ToastProps> = ({ 
  id, message, type = 'info', autoClose = 5000, onClose, 
  pauseOnHover = true, draggable = true, hideProgressBar = false, closeButton = true 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const toastRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef({ x: 0, startOffset: 0 });
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  const toastStyle = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = toastStyle.icon;

  useEffect(() => {
    setIsVisible(true);
    if (autoClose > 0) startCountdown();
    return () => clearAllTimers();
  }, []);

  const clearAllTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startCountdown = () => {
    clearAllTimers();
    startTimeRef.current = Date.now();
    isPausedRef.current = false;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - startTimeRef.current);
      const progressPercentage = Math.max(0, 100 - (elapsed / autoClose) * 100);
      setProgress(progressPercentage);
      if (progressPercentage <= 0) handleClose();
    }, 16);

    timeoutRef.current = setTimeout(() => {
      if (!isPausedRef.current) handleClose();
    }, autoClose - elapsedBeforePauseRef.current);
  };

  const handleMouseEnter = () => {
    if (!pauseOnHover || isPausedRef.current) return;
    setIsPaused(true);
    isPausedRef.current = true;
    elapsedBeforePauseRef.current += (Date.now() - startTimeRef.current);
    clearAllTimers();
  };

  const handleMouseLeave = () => {
    if (!pauseOnHover || !isPausedRef.current) return;
    setIsPaused(false);
    isPausedRef.current = false;
    startCountdown();
  };

const handleClose = () => {
  clearAllTimers();
  setIsVisible(false);
  setTimeout(() => onClose(id), 300);
};
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    setIsDragging(true);
    if (pauseOnHover && !isPausedRef.current) handleMouseEnter();
    dragStartRef.current = { x: e.clientX, startOffset: dragOffset };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !draggable) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const newOffset = dragStartRef.current.startOffset + deltaX;
    setDragOffset(newOffset);
    if (Math.abs(newOffset) > 250) handleClose();
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!isPaused) handleMouseLeave();
    if (Math.abs(dragOffset) < 250) setDragOffset(0);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const rotation = isDragging ? Math.min(Math.abs(dragOffset) / 50, 5) * Math.sign(dragOffset) : 0;

return (
  <div
    ref={toastRef}
    className={`
      relative w-96 max-w-full mx-auto rounded-xl border shadow-xl cursor-pointer
      transform transition-all duration-300 ease-out select-none overflow-hidden
      ${toastStyle.bgColor} ${toastStyle.borderColor}
      ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
      ${isDragging ? 'shadow-2xl scale-105 z-50 cursor-grabbing' : 'cursor-grab'}
      ${isPaused ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}
    `}
    style={{
      transform: `translateX(${dragOffset}px) rotate(${rotation}deg) scale(${isDragging ? 1.05 : 1})`,
      opacity: Math.max(0.3, 1 - Math.abs(dragOffset) / 300),
      transition: isDragging ? 'none' : 'all 0.3s ease-out',
      zIndex: isDragging ? 1000 : 999,
    }}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    onMouseDown={handleMouseDown}
  >
    {/* Main Content - CENTER ALIGNED */}
    <div className="flex items-center p-4 gap-3 min-h-16">
      {/* Icon */}
      <div className={`flex-shrink-0 ${toastStyle.iconColor}`}>
        <IconComponent size={24} />
      </div>

      {/* Message */}
      <div className={`flex-1 text-sm font-medium ${toastStyle.textColor} leading-relaxed`}>
        {typeof message === 'string' ? (
          <p className="whitespace-pre-wrap break-words">{message}</p>
        ) : (
          <div className="break-words">{message}</div>
        )}
      </div>

      {/* Close Button - NO DRAG TRIGGER */}
      {closeButton && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag
            handleClose();       // No event passed
          }}
          className={`flex-shrink-0 w-8 h-8 rounded-full hover:bg-white/30 flex items-center justify-center transition-all ${toastStyle.textColor} opacity-70 hover:opacity-100`}
        >
          <X size={16} />
        </button>
      )}
    </div>

    {/* Progress Bar */}
    {!hideProgressBar && autoClose > 0 && (
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30">
        <div
          className={`h-full transition-none ${toastStyle.progressColor}`}
          style={{ 
            width: `${progress}%`, 
            opacity: isPaused ? 0.6 : 1,
            transition: 'width 0.1s linear'
          }}
        />
      </div>
    )}

    {/* Pause Indicator */}
    {isPaused && (
      <div className="absolute top-3 right-3 flex gap-1">
        <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse"></div>
        <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      </div>
    )}

    {/* MODERN SWIPE TO DISMISS HINT - Only on drag */}
    {/* {isDragging && (
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm text-gray-700 text-xs font-medium px-4 py-2 rounded-full shadow-lg animate-pulse">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          Swipe to dismiss
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l4 4 4-4m0-6l-4-4-4 4" />
          </svg>
        </div>
      </div>
    )} */}
  </div>
);
};

// === ToastContainer ===
const ToastContainer: React.FC<ToastContainerProps> = ({ 
  position = 'top-right', limit = 5 
}) => {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts } = context;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-center': return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 right-4';
    }
  };

  const limitedToasts = toasts.slice(-limit);

  return (
    <div className={`fixed pointer-events-none ${getPositionClasses()}`} style={{ zIndex: 99999 }}>
      <div className="pointer-events-auto space-y-3">
        {limitedToasts.map((toast, index) => (
          <div key={toast.id} style={{ animationDelay: `${index * 100}ms` }}>
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </div>
  );
};

// === ToastProvider (with auto container) ===
const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = (message: string | ReactNode, options: ToastOptions = {}) => {
    const id = Date.now() + Math.random() + '';
    const newToast = {
      id,
      message,
      type: options.type || 'info',
      autoClose: options.autoClose ?? 5000,
      pauseOnHover: options.pauseOnHover ?? true,
      draggable: options.draggable ?? true,
      hideProgressBar: options.hideProgressBar ?? false,
      closeButton: options.closeButton ?? true,
      onClose: (toastId: string) => removeToast(toastId),
    };
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const dismissAll = () => setToasts([]);

  const isActive = (id: string) => toasts.some(toast => toast.id === id);

  const toast = {
    success: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'success' }),
    error: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'error' }),
    info: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'info' }),
    warning: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'warning' }),
    dismiss: removeToast,
    dismissAll,
    isActive,
    show: addToast
  };

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <ToastContainer position="top-right" limit={5} />
    </ToastContext.Provider>
  );
};

// === Hook ===
const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context.toast;
};

export { ToastProvider, useToast };