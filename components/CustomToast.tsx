"use client";

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle,
  X 
} from 'lucide-react';

// Types
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

// Toast Types और Colors with Lucide Icons
const TOAST_TYPES = {
  success: {
    color: '#07bc0c',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-500',
    progressColor: 'bg-green-500',
    icon: CheckCircle
  },
  error: {
    color: '#e74c3c',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
    progressColor: 'bg-red-500',
    icon: XCircle
  },
  info: {
    color: '#3498db',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500',
    progressColor: 'bg-blue-500',
    icon: Info
  },
  warning: {
    color: '#f1c40f',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500',
    progressColor: 'bg-yellow-500',
    icon: AlertTriangle
  }
};

// Toast Context
const ToastContext = createContext<ToastContextType | null>(null);

// 🎯 PERFECT Hover Pause & Resume - Guaranteed Working
const Toast: React.FC<ToastProps> = ({ 
  id, 
  message, 
  type = 'info', 
  autoClose = 5000, 
  onClose, 
  pauseOnHover = true,
  draggable = true,
  hideProgressBar = false,
  closeButton = true 
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
  
  // 🎯 FIXED: Better timing management
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  const toastStyle = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = toastStyle.icon;

  // Initialize
  useEffect(() => {
    setIsVisible(true);
    
    if (autoClose > 0) {
      startCountdown();
    }

    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 🎯 FIXED: Perfect countdown logic
  const startCountdown = () => {
    clearAllTimers();
    
    startTimeRef.current = Date.now();
    isPausedRef.current = false;

    // Progress bar update - 60fps smooth
    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return; // Skip if paused
      
      const currentTime = Date.now();
      const totalElapsed = elapsedBeforePauseRef.current + (currentTime - startTimeRef.current);
      const progressPercentage = Math.max(0, 100 - (totalElapsed / autoClose) * 100);
      
      setProgress(progressPercentage);

      if (progressPercentage <= 0) {
        handleClose();
      }
    }, 16); // ~60fps

    // Auto close timeout
    timeoutRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        handleClose();
      }
    }, autoClose - elapsedBeforePauseRef.current);
  };

  // 🎯 FIXED: Perfect pause logic
  const handleMouseEnter = () => {
    if (!pauseOnHover || isPausedRef.current) return;
    
    console.log('🖱️ Mouse Enter - Pausing Timer');
    setIsPaused(true);
    isPausedRef.current = true;
    
    // Store elapsed time when pausing
    const currentTime = Date.now();
    elapsedBeforePauseRef.current += (currentTime - startTimeRef.current);
    
    console.log(`⏸️ Paused - Total elapsed: ${elapsedBeforePauseRef.current}ms, Remaining: ${autoClose - elapsedBeforePauseRef.current}ms`);
    
    clearAllTimers();
  };

  // 🎯 FIXED: Perfect resume logic - WAHI SE CONTINUE HOGA
  const handleMouseLeave = () => {
    if (!pauseOnHover || !isPausedRef.current) return;
    
    console.log('🖱️ Mouse Leave - Resuming Timer');
    setIsPaused(false);
    isPausedRef.current = false;
    
    console.log(`▶️ Resuming from ${elapsedBeforePauseRef.current}ms, ${autoClose - elapsedBeforePauseRef.current}ms remaining`);
    
    // Resume with remaining time
    startCountdown();
  };

  const handleClose = () => {
    clearAllTimers();
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  // Drag functionality with pause
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    
    console.log('👆 Drag Start - Pausing Timer');
    setIsDragging(true);
    
    // Pause on drag start
    if (pauseOnHover && !isPausedRef.current) {
      handleMouseEnter();
    }
    
    dragStartRef.current = {
      x: e.clientX,
      startOffset: dragOffset
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !draggable) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const newOffset = dragStartRef.current.startOffset + deltaX;
    setDragOffset(newOffset);
    
    if (Math.abs(newOffset) > 250) {
      handleClose();
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    console.log('👆 Drag End - Resuming Timer if not hovered');
    setIsDragging(false);
    
    // Resume only if not hovering (mouse might still be over toast)
    if (!isPaused) {
      handleMouseLeave();
    }
    
    if (Math.abs(dragOffset) < 250) {
      setDragOffset(0);
    }
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

  // Rotation effect during drag
  const rotation = isDragging ? Math.min(Math.abs(dragOffset) / 50, 5) * Math.sign(dragOffset) : 0;

  return (
    <div
      ref={toastRef}
      className={`
        relative w-80 min-h-16 mb-3 rounded-lg border shadow-lg cursor-pointer
        transform transition-all duration-300 ease-out select-none overflow-hidden
        ${toastStyle.bgColor} ${toastStyle.borderColor}
        ${isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
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
      <div className="flex items-start p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 mr-3 ${toastStyle.iconColor}`}>
          <IconComponent size={20} />
        </div>
        
        <div className={`flex-1 text-sm font-medium ${toastStyle.textColor}`}>
          {typeof message === 'string' ? (
            <p className="leading-relaxed break-words whitespace-pre-wrap">{message}</p>
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
            className={`flex-shrink-0 w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors ${toastStyle.textColor} opacity-70 hover:opacity-100 ml-2`}
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* Progress Bar */}
      {!hideProgressBar && autoClose > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
          <div
            className={`h-full transition-none ${toastStyle.progressColor}`}
            style={{
              width: `${progress}%`,
              opacity: isPaused ? 0.6 : 1,
            }}
          />
        </div>
      )}

      {/* 🎯 Pause Indicator (II) - Shows when paused */}
      {isPaused && (
        <div className="absolute top-2 right-2 flex gap-0.5">
          <div className="w-1 h-3 bg-blue-500 rounded-sm animate-pulse"></div>
          <div className="w-1 h-3 bg-blue-500 rounded-sm animate-pulse" style={{animationDelay: '0.2s'}}></div>
        </div>
      )}

      {/* Drag Indicator */}
      {isDragging && (
        <div className="absolute top-2 left-2 text-xs text-gray-600 bg-white/90 px-2 py-0.5 rounded shadow-sm">
          Swipe to dismiss →
        </div>
      )}
    </div>
  );
};

// ToastContainer Component
const ToastContainer: React.FC<ToastContainerProps> = ({ 
  position = 'top-right', 
  autoClose = 5000,
  hideProgressBar = false,
  pauseOnHover = true,
  draggable = true,
  closeButton = true,
  limit = 5 
}) => {
  const context = useContext(ToastContext);
  if (!context) return null;
  
  const { toasts } = context;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const limitedToasts = toasts.slice(-limit);

  return (
    <div 
      className={`fixed pointer-events-none ${getPositionClasses()}`}
      style={{ 
        zIndex: 99999,
        position: 'fixed'
      }}
    >
      <div className="pointer-events-auto space-y-3">
        {limitedToasts.map((toast, index) => (
          <div 
            key={toast.id} 
            className="toast-wrapper"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <Toast
              {...toast}
              autoClose={toast.autoClose ?? autoClose}
              hideProgressBar={toast.hideProgressBar ?? hideProgressBar}
              pauseOnHover={toast.pauseOnHover ?? pauseOnHover}
              draggable={toast.draggable ?? draggable}
              closeButton={toast.closeButton ?? closeButton}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Toast Provider Component
const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = (message: string | ReactNode, options: ToastOptions = {}) => {
    const id = Date.now() + Math.random() + '';
    const newToast = {
      id,
      message,
      type: options.type || 'info',
      autoClose: options.autoClose !== undefined ? options.autoClose : 5000,
      pauseOnHover: options.pauseOnHover !== undefined ? options.pauseOnHover : true,
      draggable: options.draggable !== undefined ? options.draggable : true,
      hideProgressBar: options.hideProgressBar || false,
      closeButton: options.closeButton !== undefined ? options.closeButton : true,
      onClose: (toastId: string) => removeToast(toastId),
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const dismissAll = () => {
    setToasts([]);
  };

  const isActive = (id: string) => {
    return toasts.some(toast => toast.id === id);
  };

  const toast = {
    success: (message: string | ReactNode, options?: ToastOptions) => addToast(message, { ...options, type: 'success' }),
    error: (message: string | ReactNode, options?: ToastOptions) => addToast(message, { ...options, type: 'error' }),
    info: (message: string | ReactNode, options?: ToastOptions) => addToast(message, { ...options, type: 'info' }),
    warning: (message: string | ReactNode, options?: ToastOptions) => addToast(message, { ...options, type: 'warning' }),
    dismiss: removeToast,
    dismissAll,
    isActive,
    show: addToast
  };

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

// Hook to use toast
const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

export { ToastProvider, ToastContainer, useToast };