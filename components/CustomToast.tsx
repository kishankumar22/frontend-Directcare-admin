"use client";

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle,
  X 
} from 'lucide-react';

// === Types (same as before) ===
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

const TOAST_TYPES = {
  success: { 
    bgColor: 'bg-green-50 dark:bg-green-900/20', 
    borderColor: 'border-green-200 dark:border-green-800', 
    textColor: 'text-green-800 dark:text-green-200', 
    iconColor: 'text-green-500 dark:text-green-400', 
    progressColor: 'bg-green-500', 
    icon: CheckCircle 
  },
  error: { 
    bgColor: 'bg-red-50 dark:bg-red-900/20', 
    borderColor: 'border-red-200 dark:border-red-800', 
    textColor: 'text-red-800 dark:text-red-200', 
    iconColor: 'text-red-500 dark:text-red-400', 
    progressColor: 'bg-red-500', 
    icon: XCircle 
  },
  info: { 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20', 
    borderColor: 'border-blue-200 dark:border-blue-800', 
    textColor: 'text-blue-800 dark:text-blue-200', 
    iconColor: 'text-blue-500 dark:text-blue-400', 
    progressColor: 'bg-blue-500', 
    icon: Info 
  },
  warning: { 
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', 
    borderColor: 'border-yellow-200 dark:border-yellow-800', 
    textColor: 'text-yellow-800 dark:text-yellow-200', 
    iconColor: 'text-yellow-500 dark:text-yellow-400', 
    progressColor: 'bg-yellow-500', 
    icon: AlertTriangle 
  }
};

const ToastContext = createContext<ToastContextType | null>(null);

// === 🔥 PERFECT Toast Component with Pause/Resume ===
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef({ x: 0, startOffset: 0 });
  const pauseTimeRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(autoClose);
  const isPausedRef = useRef<boolean>(false);

  const toastStyle = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = toastStyle.icon;

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
    
    if (autoClose > 0) {
      startCountdown();
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // 🔥 Start countdown with smooth CSS animation
  const startCountdown = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    isPausedRef.current = false;
    
    // 🔥 Smooth CSS transform animation
    if (progressRef.current) {
      progressRef.current.style.transition = 'none';
      progressRef.current.style.transform = 'scaleX(1)';
      
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `transform ${remainingTimeRef.current}ms linear`;
          progressRef.current.style.transform = 'scaleX(0)';
        }
      });
    }

    // Timer to close when done
    timeoutRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        handleClose();
      }
    }, remainingTimeRef.current);
  };

  // 🔥 Pause: Save current position
  const handleMouseEnter = () => {
    if (!pauseOnHover || isPausedRef.current) return;
    
    setIsPaused(true);
    isPausedRef.current = true;
    pauseTimeRef.current = Date.now();
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 🔥 Get current scale and calculate remaining time
    if (progressRef.current) {
      const computedStyle = window.getComputedStyle(progressRef.current);
      const matrix = new DOMMatrix(computedStyle.transform);
      const currentScale = Math.max(0, Math.min(1, matrix.a)); // scaleX value (0 to 1)
      
      // Update remaining time based on current progress
      remainingTimeRef.current = Math.ceil(remainingTimeRef.current * currentScale);
      
      // Freeze at current position
      const currentTransform = computedStyle.transform;
      progressRef.current.style.transition = 'none';
      progressRef.current.style.transform = currentTransform;
    }
  };

  // 🔥 Resume: Continue from paused position
  const handleMouseLeave = () => {
    if (!pauseOnHover || !isPausedRef.current) return;
    
    setIsPaused(false);
    isPausedRef.current = false;
    
    // 🔥 Resume animation from current position
    if (progressRef.current && remainingTimeRef.current > 0) {
      const computedStyle = window.getComputedStyle(progressRef.current);
      const currentTransform = computedStyle.transform;
      
      // Get current scale to resume from exact position
      const matrix = new DOMMatrix(currentTransform);
      const currentScale = Math.max(0, Math.min(1, matrix.a));
      
      // Set starting position
      progressRef.current.style.transition = 'none';
      progressRef.current.style.transform = `scaleX(${currentScale})`;
      
      // Resume animation to 0
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `transform ${remainingTimeRef.current}ms linear`;
          progressRef.current.style.transform = 'scaleX(0)';
        }
      });
      
      // Set new timeout for remaining time
      timeoutRef.current = setTimeout(() => {
        if (!isPausedRef.current) {
          handleClose();
        }
      }, remainingTimeRef.current);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
    if (Math.abs(newOffset) > 300) handleClose();
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!isPaused) handleMouseLeave();
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
  }, [isDragging, dragOffset]);

  const rotation = isDragging ? Math.min(Math.abs(dragOffset) / 80, 8) * Math.sign(dragOffset) : 0;

  return (
    <div
      ref={toastRef}
      className={`
        relative w-96 max-w-full rounded-xl border-2 shadow-2xl
        transform ease-out select-none overflow-hidden backdrop-blur-sm
        ${toastStyle.bgColor} ${toastStyle.borderColor}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
        ${isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.3)] scale-105 z-50 cursor-grabbing' : 'cursor-grab hover:shadow-xl'}
        ${isPaused ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-opacity-50' : ''}
        transition-all duration-400
      `}
      style={{
        transform: `translateX(${dragOffset}px) rotate(${rotation}deg) scale(${isDragging ? 1.05 : 1})`,
        opacity: Math.max(0.5, 1 - Math.abs(dragOffset) / 400),
        transitionProperty: isDragging ? 'box-shadow' : 'all',
        transitionDuration: isDragging ? '200ms' : '400ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: isDragging ? 1000 : 999 - index,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center p-4 gap-3 min-h-16">
        <div className={`flex-shrink-0 ${toastStyle.iconColor}`}>
          <IconComponent size={24} strokeWidth={2.5} />
        </div>

        <div className={`flex-1 text-sm font-medium ${toastStyle.textColor} leading-relaxed`}>
          {typeof message === 'string' ? (
            <p className="whitespace-pre-wrap break-words">{message}</p>
          ) : (
            <div className="break-words">{message}</div>
          )}
        </div>

        {closeButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
              transition-all duration-200 ${toastStyle.textColor}
              hover:bg-white/40 dark:hover:bg-black/20 active:scale-90
              opacity-60 hover:opacity-100
            `}
            aria-label="Close notification"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* 🔥 SMOOTH Progress Bar with Perfect Pause/Resume */}
      {!hideProgressBar && autoClose > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            ref={progressRef}
            className={`h-full ${toastStyle.progressColor} origin-left`}
            style={{ 
              transform: 'scaleX(1)',
              opacity: isPaused ? 0.5 : 1,
              willChange: 'transform',
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

      {isDragging && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-black/10 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold">
            {Math.abs(dragOffset) > 200 ? '👋 Release to dismiss' : '↔️ Swipe to dismiss'}
          </div>
        </div>
      )}
    </div>
  );
};

// === Toast Container (same as before) ===
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

// === Provider (same as before) ===
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
      position: options.position || 'top-right',
      onClose: (toastId: string) => removeToast(toastId),
    };
    
    setToasts(prev => {
      const samePositionToasts = prev.filter(t => t.position === newToast.position);
      if (samePositionToasts.length >= 5) {
        const oldestId = samePositionToasts[0].id;
        return [...prev.filter(t => t.id !== oldestId), newToast];
      }
      return [...prev, newToast];
    });
    
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
