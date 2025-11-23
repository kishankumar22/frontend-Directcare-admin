"use client";

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

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
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  index?: number;
}

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  autoClose?: number;
  pauseOnHover?: boolean;
  draggable?: boolean;
  hideProgressBar?: boolean;
  closeButton?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
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

// === Styled Types ===
const TOAST_TYPES = {
  success: { 
    bg: 'bg-gradient-to-br from-green-50 via-green-100 to-green-200 dark:from-green-900 dark:via-green-800 dark:to-green-900',
    border: 'border-green-300 dark:border-green-600',
    text: 'text-green-950 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
    progress: 'bg-gradient-to-r from-green-400 via-green-500 to-green-600',
    iconComponent: CheckCircle
  },
  error: {
    bg: 'bg-gradient-to-br from-red-50 via-red-100 to-red-200 dark:from-red-900 dark:via-red-800 dark:to-red-900',
    border: 'border-red-300 dark:border-red-600',
    text: 'text-red-950 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
    progress: 'bg-gradient-to-r from-red-400 via-red-500 to-red-600',
    iconComponent: XCircle
  },
  info: { 
    bg: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-blue-900 dark:via-blue-800 dark:to-blue-900',
    border: 'border-blue-300 dark:border-blue-600',
    text: 'text-blue-950 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
    progress: 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600',
    iconComponent: Info
  },
  warning: { 
    bg: 'bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200 dark:from-yellow-900 dark:via-yellow-800 dark:to-yellow-900',
    border: 'border-yellow-300 dark:border-yellow-600',
    text: 'text-yellow-950 dark:text-yellow-100',
    icon: 'text-yellow-600 dark:text-yellow-400',
    progress: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600',
    iconComponent: AlertTriangle
  }
};

const ToastContext = createContext<ToastContextType | null>(null);

// === Main Toast Component (Modern/Gradient/Accurate Pause/Resume) ===
const Toast: React.FC<ToastProps> = ({ 
  id, message, type = 'info', autoClose = 5000, onClose, 
  pauseOnHover = true, draggable = true, hideProgressBar = false, closeButton = true,
  index = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const toastRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, startOffset: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationStartRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const totalPausedRef = useRef<number>(0);

  const style = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = style.iconComponent;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    if (autoClose > 0) startAnimation();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // --- CSS animation start ---
  const startAnimation = () => {
    animationStartRef.current = Date.now();
    totalPausedRef.current = 0;
    if (progressRef.current) {
      progressRef.current.style.width = '100%';
      progressRef.current.style.transition = 'none';
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${autoClose}ms linear`;
          progressRef.current.style.width = '0%';
        }
      });
    }
    timeoutRef.current = setTimeout(handleClose, autoClose);
  };

  // --- Pause on hover ---
  const handleMouseEnter = () => {
    if (!pauseOnHover || isPaused) return;
    setIsPaused(true);
    pauseStartRef.current = Date.now();
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (progressRef.current) {
      const comp = window.getComputedStyle(progressRef.current);
      const width = parseFloat(comp.width);
      const parentWidth = progressRef.current.parentElement?.offsetWidth || 1;
      const widthPercent = (width / parentWidth) * 100;
      progressRef.current.style.transition = 'none';
      progressRef.current.style.width = `${widthPercent}%`;
    }
  };

  // --- Resume animation ---
  const handleMouseLeave = () => {
    if (!pauseOnHover || !isPaused) return;
    setIsPaused(false);
    const pauseDuration = Date.now() - pauseStartRef.current;
    totalPausedRef.current += pauseDuration;
    const elapsed = Date.now() - animationStartRef.current - totalPausedRef.current;
    const remaining = Math.max(0, autoClose - elapsed);
    if (remaining <= 0) { handleClose(); return; }
    if (progressRef.current) {
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${remaining}ms linear`;
          progressRef.current.style.width = '0%';
        }
      });
    }
    timeoutRef.current = setTimeout(handleClose, remaining);
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  // --- Drag to dismiss ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    setIsDragging(true);
    if (pauseOnHover && !isPaused) handleMouseEnter();
    dragStartRef.current = { x: e.clientX, startOffset: dragOffset };
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !draggable) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const newOffset = dragStartRef.current.startOffset + deltaX;
    setDragOffset(newOffset);
    if (Math.abs(newOffset) > 300) handleClose();
  };
  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (isPaused) handleMouseLeave();
    if (Math.abs(dragOffset) < 300) setDragOffset(0);
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
  }, [isDragging, dragOffset, isPaused]);

  const rotation = isDragging ? Math.min(Math.abs(dragOffset) / 80, 8) * Math.sign(dragOffset) : 0;

  // --- Render ---
  return (
    <div
      ref={toastRef}
      className={`
        relative w-[380px] max-w-full rounded-2xl border-2 shadow-2xl drop-shadow-xl
        overflow-hidden backdrop-blur-md
        ${style.bg} ${style.border}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
        ${isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.16)] scale-105 z-50 cursor-grabbing' : 'cursor-grab hover:shadow-lg'}
        ${isPaused ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-opacity-60' : ''}
        transition-all duration-500
      `}
      style={{
        transform: `translateX(${dragOffset}px) rotate(${rotation}deg) scale(${isDragging ? 1.05 : 1})`,
        opacity: Math.max(0.5, 1 - Math.abs(dragOffset) / 400),
        zIndex: isDragging ? 1000 : 999 - index,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center p-5 gap-4 min-h-16">
        <div className={`flex-shrink-0 ${style.icon}`}>
          <IconComponent size={30} strokeWidth={2.5} />
        </div>
        <div className={`flex-1 text-base font-semibold ${style.text} leading-relaxed`}>
          {typeof message === 'string'
            ? <p className="whitespace-pre-wrap break-words">{message}</p>
            : <div className="break-words">{message}</div>}
        </div>
        {closeButton && (
          <button
            onClick={e => { e.stopPropagation(); handleClose(); }}
            className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
              transition-all duration-300 ${style.text}
              hover:bg-black/20 dark:hover:bg-white/10 active:scale-95
              opacity-60 hover:opacity-100
            `}
            aria-label="Close notification"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
      {!hideProgressBar && autoClose > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            ref={progressRef}
            className={`h-full ${style.progress} will-change-auto`}
            style={{
              width: '100%',
              opacity: isPaused ? 0.5 : 1,
            }}
          />
        </div>
      )}
      {isPaused && (
        <div className="absolute top-2 right-12 flex gap-1">
          <div className="w-1.5 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-1.5 h-3 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></div>
        </div>
      )}
      {/* {isDragging && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold">
            {Math.abs(dragOffset) > 200 ? '👋 Release to dismiss' : '↔️ Swipe to dismiss'}
          </div>
        </div>
      )} */}
    </div>
  );
};

// === Toast Container (unchanged) ===
const ToastContainerByPosition: React.FC<{
  position: string;
  toasts: any[];
  limit: number;
}> = ({ position, toasts, limit }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4 items-start';
      case 'top-center': return 'top-4 left-1/2 -translate-x-1/2 items-center';
      case 'top-right': return 'top-4 right-4 items-end';
      case 'bottom-left': return 'bottom-4 left-4 items-start flex-col-reverse';
      case 'bottom-center': return 'bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse';
      case 'bottom-right': return 'bottom-4 right-4 items-end flex-col-reverse';
      default: return 'top-4 right-4 items-end';
    }
  };
  const positionToasts = toasts.filter(t => (t.position || 'top-right') === position);
  const limitedToasts = positionToasts.slice(-limit);
  if (limitedToasts.length === 0) return null;
  return (
    <div className={`fixed pointer-events-none flex flex-col gap-3 z-[99999] ${getPositionClasses()}`}>
      {limitedToasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto transition-all duration-400 ease-out"
          style={{
            transform: `translateY(${index * -4}px) scale(${1 - index * 0.02})`,
            zIndex: limitedToasts.length - index,
            opacity: 1 - index * 0.15,
          }}
        >
          <Toast {...toast} index={index} />
        </div>
      ))}
    </div>
  );
};

// === Provider (unchanged) ===
const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<any[]>([]);
  const addToast = (message: string | ReactNode, options: ToastOptions = {}) => {
    const id = Date.now() + Math.random() + '';
    const newToast = {
      id, message,
      type: options.type || 'info',
      autoClose: options.autoClose ?? 5000,
      pauseOnHover: options.pauseOnHover ?? true,
      draggable: options.draggable ?? true,
      hideProgressBar: options.hideProgressBar ?? false,
      closeButton: options.closeButton ?? true,
      position: options.position || 'top-right',
      onClose: (toastId: string) => removeToast(toastId),
    };
    setToasts(prev => {
      const same = prev.filter(t => t.position === newToast.position);
      if (same.length >= 5) {
        const oldestId = same[0].id;
        return [...prev.filter(t => t.id !== oldestId), newToast];
      }
      return [...prev, newToast];
    });
    return id;
  };
  const removeToast = (id: string) => { setToasts(prev => prev.filter(toast => toast.id !== id)); };
  const dismissAll = () => setToasts([]);
  const isActive = (id: string) => toasts.some(toast => toast.id === id);
  const toast = {
    success: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'success' }),
    error: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'error' }),
    info: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'info' }),
    warning: (msg: string | ReactNode, opts?: ToastOptions) => addToast(msg, { ...opts, type: 'warning' }),
    dismiss: removeToast, dismissAll, isActive, show: addToast
  };
  const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      {positions.map(pos => (
        <ToastContainerByPosition key={pos} position={pos} toasts={toasts} limit={5} />
      ))}
    </ToastContext.Provider>
  );
};

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context.toast;
};

export { ToastProvider, useToast };
