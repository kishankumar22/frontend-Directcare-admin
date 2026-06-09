'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function ScrollToTopButton() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const main = document.querySelector('main') as HTMLElement | null;
    if (!main) return;

    scrollContainerRef.current = main;

    const handleScroll = () => {
      const element = scrollContainerRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;

      const maxScrollable = scrollHeight - clientHeight;
      const progress =
        maxScrollable > 0 ? (scrollTop / maxScrollable) * 100 : 0;

      setScrollProgress(Math.min(100, Math.max(0, progress)));

      setShowScrollTop(scrollTop > 200);

      const distanceFromBottom =
        scrollHeight - (scrollTop + clientHeight);

      setShowScrollBottom(distanceFromBottom > 200);

      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    handleScroll();

    main.addEventListener('scroll', handleScroll);

    return () => {
      main.removeEventListener('scroll', handleScroll);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const smoothScrollTo = (
    target: number,
    duration = 600
  ) => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const start = element.scrollTop;
    const distance = target - start;

    let startTime: number | null = null;

    const easeInOutCubic = (t: number) =>
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;

      const timeElapsed = currentTime - startTime;
      const progress = Math.min(
        timeElapsed / duration,
        1
      );

      const easing = easeInOutCubic(progress);

      element.scrollTop =
        start + distance * easing;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const scrollToTop = () => {
    smoothScrollTo(0);
  };

  const scrollToBottom = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    smoothScrollTo(element.scrollHeight);
  };

  return (
    <>
      {/* Progress Bar */}
      {(showScrollTop || showScrollBottom) && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800/30 z-[9999]">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 transition-all duration-200"
            style={{
              width: `${scrollProgress}%`,
            }}
          />
        </div>
      )}

      {/* Scroll To Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          disabled={isScrolling}
          aria-label="Scroll to top"
          className="
            fixed bottom-24 right-8 z-[9999]
            w-10 h-10
            flex items-center justify-center
            rounded-full
            bg-gradient-to-r from-violet-500 to-cyan-500
            hover:from-violet-600 hover:to-cyan-600
            text-white
            shadow-[0_8px_30px_rgba(139,92,246,0.35)]
            transition-all duration-300
            hover:scale-110
            active:scale-95
            disabled:opacity-50
          "
        >
          <ArrowUp size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Scroll To Bottom */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          disabled={isScrolling}
          aria-label="Scroll to bottom"
          className="
            fixed bottom-12 right-8 z-[9999]
             w-10 h-10
            flex items-center justify-center
            rounded-full
            bg-gradient-to-r from-emerald-500 to-teal-500
            hover:from-emerald-600 hover:to-teal-600
            text-white
            shadow-[0_8px_30px_rgba(16,185,129,0.35)]
            transition-all duration-300
            hover:scale-110
            active:scale-95
            disabled:opacity-50
          "
        >
          <ArrowDown size={22} strokeWidth={2.5} />
        </button>
      )}
    </>
  );
}