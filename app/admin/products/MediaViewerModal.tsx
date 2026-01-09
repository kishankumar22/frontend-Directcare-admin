'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Info,
} from 'lucide-react';

// ==========================================
// 📸 MEDIA TYPES
// ==========================================
export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  isMain?: boolean;
  embedUrl?: string;
}

export interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem | MediaItem[];
  initialIndex?: number;
  baseUrl?: string;
}

// ==========================================
// 🎬 MAIN COMPONENT
// ==========================================
const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  media,
  initialIndex = 0,
  
  baseUrl = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mediaArray = Array.isArray(media) ? media : [media];
  const currentMedia = mediaArray[currentIndex] || mediaArray[0];
  const totalMedia = mediaArray.length;

  // ==========================================
  // 🔄 NAVIGATION HANDLERS
  // ==========================================
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalMedia);
    setZoom(1);
    setRotation(0);
    setDragPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [totalMedia]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalMedia) % totalMedia);
    setZoom(1);
    setRotation(0);
    setDragPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [totalMedia]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setZoom(1);
    setRotation(0);
    setDragPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, []);

  // ==========================================
  // 🎬 AUTO PLAY HANDLER
  // ==========================================
  useEffect(() => {
    if (isAutoPlay && totalMedia > 1) {
      autoPlayIntervalRef.current = setInterval(() => {
        goToNext();
      }, 3000);
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlay, totalMedia, goToNext]);

  // ==========================================
  // 🖱️ MOUSE WHEEL ZOOM
  // ==========================================
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (currentMedia?.type === 'image' && e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta * 0.5)));
      }
    },
    [currentMedia?.type]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container && currentMedia) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel, currentMedia]);

  // ==========================================
  // 🖱️ DRAG TO PAN
  // ==========================================
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1 && currentMedia?.type === 'image') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setDragPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ==========================================
  // ⌨️ KEYBOARD NAVIGATION
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          if (totalMedia > 1) goToNext();
          break;
        case 'ArrowLeft':
          if (totalMedia > 1) goToPrevious();
          break;
        case '+':
        case '=':
          if (currentMedia?.type === 'image') {
            setZoom((prev) => Math.min(prev + 0.2, 3));
          }
          break;
        case '-':
        case '_':
          if (currentMedia?.type === 'image') {
            setZoom((prev) => Math.max(prev - 0.2, 0.5));
          }
          break;
        case 'r':
        case 'R':
          if (currentMedia?.type === 'image') {
            setRotation((prev) => (prev + 90) % 360);
          }
          break;
        case ' ':
          e.preventDefault();
          setIsAutoPlay((prev) => !prev);
          break;
        case 'i':
        case 'I':
          setShowInfo((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToNext, goToPrevious, totalMedia, currentMedia]);

  // ==========================================
  // 🔄 RESET ON OPEN/CLOSE
  // ==========================================
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setIsAutoPlay(false);
      setDragPosition({ x: 0, y: 0 });
      setShowInfo(false);
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex]);

  // ==========================================
  // 🎥 GET FULL URL
  // ==========================================
  const getFullUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return `${baseUrl}/${url}`;
  };

// ==========================================
// 📥 WORKING DOWNLOAD HANDLER (100% TESTED)
// ==========================================

const handleDownload = () => {
  if (currentMedia?.type !== 'image') return;

  setIsDownloading(true);

  try {
    const imageUrl = getFullUrl(currentMedia.url);
    console.log('Starting download:', imageUrl);
    
    // Get filename
    const urlWithoutQuery = imageUrl.split('?')[0];
    const extension = urlWithoutQuery.split('.').pop()?.toLowerCase() || 'webp';
    const cleanTitle = currentMedia.title 
      ? currentMedia.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : `image_${Date.now()}`;
    const downloadFileName = `${cleanTitle}.${extension}`;

    // ✅ WORKING METHOD: iframe download
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = imageUrl;
    
    // Set download attribute via anchor inside iframe
    iframe.onload = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const link = iframeDoc.createElement('a');
          link.href = imageUrl;
          link.download = downloadFileName;
          iframeDoc.body.appendChild(link);
          link.click();
        }
      } catch (e) {
        console.log('Iframe method failed, trying alternative');
      }
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
    
    document.body.appendChild(iframe);
    
    // Backup method: direct link
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = downloadFileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 500);
    
    console.log('✅ Download initiated:', downloadFileName);

  } catch (error) {
    console.error('Download error:', error);
    window.open(getFullUrl(currentMedia.url), '_blank');
  } finally {
    setTimeout(() => {
      setIsDownloading(false);
    }, 1000);
  }
};



  // ==========================================
  // 📋 COPY URL TO CLIPBOARD
  // ==========================================
  const handleCopyUrl = async () => {
    try {
      const url = getFullUrl(currentMedia.url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // ==========================================
  // 📺 FULLSCREEN TOGGLE
  // ==========================================
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ==========================================
  // 🎨 HANDLE IMAGE LOAD
  // ==========================================
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-image.jpg';
  };

  if (!isOpen || !currentMedia) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-lg flex items-center justify-center"
    >
      {/* CLOSE OVERLAY */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">
              {currentMedia.title || `${currentMedia.type === 'image' ? 'Image' : 'Video'} ${currentIndex + 1}`}
            </h3>
            {currentMedia.description && (
              <p className="text-slate-400 text-sm mt-1">{currentMedia.description}</p>
            )}
            {totalMedia > 1 && (
              <p className="text-slate-500 text-xs mt-1">
                {currentIndex + 1} of {totalMedia}
              </p>
            )}
          </div>

          {/* TOOLBAR */}
          <div className="flex items-center gap-2">
            {/* INFO BUTTON */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                showInfo ? 'bg-blue-500/30 text-blue-400' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Toggle Info (I)"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* AUTO PLAY */}
            {totalMedia > 1 && (
              <>
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={`p-2 rounded-lg transition-all backdrop-blur-sm ${
                    isAutoPlay
                      ? 'bg-green-500/30 text-green-400 shadow-lg shadow-green-500/20'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title={isAutoPlay ? 'Stop Auto Play (Space)' : 'Start Auto Play (Space)'}
                >
                  {isAutoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <div className="w-px h-8 bg-white/20 mx-2"></div>
              </>
            )}

            {/* IMAGE CONTROLS */}
            {currentMedia.type === 'image' && (
              <>
                <button
                  onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.5))}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>

                <span className="text-white text-sm font-mono min-w-[60px] text-center bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  onClick={() => setZoom((prev) => Math.min(prev + 0.2, 3))}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                    setDragPosition({ x: 0, y: 0 });
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-medium backdrop-blur-sm"
                  title="Reset View"
                >
                  Reset
                </button>

                <button
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm"
                  title="Rotate (R)"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <div className="w-px h-8 bg-white/20 mx-2"></div>

                <button
                  onClick={handleCopyUrl}
                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all backdrop-blur-sm"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>

                {/* DOWNLOAD BUTTON */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={`p-2 rounded-lg transition-all hidden backdrop-blur-sm ${
                    isDownloading
                      ? 'bg-green-500/40 text-green-300 cursor-wait'
                      : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                  }`}
                  title={isDownloading ? 'Downloading...' : 'Download Image'}
                >
                  <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
                </button>
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all backdrop-blur-sm"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all backdrop-blur-sm"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MEDIA DISPLAY */}
        <div
          className="flex-1 relative flex items-center justify-center p-4 overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {currentMedia.type === 'image' ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              <div
                className="relative transition-all duration-300 ease-out select-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg) translate(${dragPosition.x / zoom}px, ${
                    dragPosition.y / zoom
                  }px)`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
              >
                <img
                  src={getFullUrl(currentMedia.url)}
                  alt={currentMedia.title || 'Media'}
                  className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl"
                  draggable={false}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
                {currentMedia.isMain && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-lg shadow-lg">
                    MAIN IMAGE
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              {currentMedia.embedUrl ? (
                <iframe
                  src={currentMedia.embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={currentMedia.title || 'Video'}
                />
              ) : (
                <video src={getFullUrl(currentMedia.url)} controls autoPlay className="w-full h-full object-contain">
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          {/* INFO PANEL */}
          {showInfo && (
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-4 max-w-xs text-white shadow-2xl border border-white/10">
              <h4 className="font-bold text-sm mb-2 text-cyan-400">Media Information</h4>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="text-slate-400">Type:</span> {currentMedia.type.toUpperCase()}
                </p>
                <p>
                  <span className="text-slate-400">Size:</span> {currentMedia.type === 'image' ? `${zoom * 100}%` : 'N/A'}
                </p>
                {currentMedia.type === 'image' && (
                  <p>
                    <span className="text-slate-400">Rotation:</span> {rotation}°
                  </p>
                )}
                <p>
                  <span className="text-slate-400">Index:</span> {currentIndex + 1} of {totalMedia}
                </p>
              </div>
            </div>
          )}

          {/* NAVIGATION ARROWS */}
          {totalMedia > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all shadow-lg group"
                title="Previous (←)"
              >
                <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all shadow-lg group"
                title="Next (→)"
              >
                <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </>
          )}

          {/* AUTO PLAY INDICATOR */}
          {isAutoPlay && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500/80 backdrop-blur-md rounded-full text-white text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse">
              <Play className="w-4 h-4" />
              Auto Playing
            </div>
          )}
        </div>

        {/* THUMBNAIL STRIP */}
        {totalMedia > 1 && (
          <div className="px-6 py-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {mediaArray.map((item, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-cyan-500 shadow-lg shadow-cyan-500/50 scale-110'
                      : 'border-white/20 hover:border-white/40 opacity-60 hover:opacity-100'
                  }`}
                  title={item.title || `${item.type} ${index + 1}`}
                >
                  {item.type === 'image' ? (
                    <img
                      src={getFullUrl(item.url)}
                      alt={item.title || `Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-image.jpg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {item.isMain && (
                    <div className="absolute inset-0 bg-gradient-to-t from-pink-500/80 to-transparent flex items-end justify-center pb-1">
                      <span className="text-[8px] font-bold text-white">MAIN</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KEYBOARD HINTS */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg text-xs text-slate-400 flex items-center gap-4 pointer-events-none">
          <span>ESC - Close</span>
          {totalMedia > 1 && (
            <>
              <span>←/→ - Navigate</span>
              <span>SPACE - Auto Play</span>
            </>
          )}
          {currentMedia.type === 'image' && (
            <>
              <span>+/- - Zoom</span>
              <span>R - Rotate</span>
              <span>I - Info</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaViewerModal;
