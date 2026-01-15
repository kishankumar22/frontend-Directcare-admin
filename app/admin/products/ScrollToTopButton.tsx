'use client';

import { useState, useEffect } from 'react';

export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 🔍 Find the actual scrollable container
    const getScrollableParent = (): HTMLElement | Window => {
      const mainContent = document.querySelector('main');
      const contentDiv = document.querySelector('[class*="overflow"]');
      const body = document.body;
      
      if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        return mainContent as HTMLElement;
      }
      
      if (contentDiv && contentDiv.scrollHeight > contentDiv.clientHeight) {
        return contentDiv as HTMLElement;
      }
      
      if (body.scrollHeight > body.clientHeight) {
        return body;
      }
      
      return window;
    };

    const scrollContainer = getScrollableParent();
    
    const toggleVisibility = () => {
      let scrollTop = 0;
      
      if (scrollContainer === window) {
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      } else {
        scrollTop = (scrollContainer as HTMLElement).scrollTop;
      }
      
      if (scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    toggleVisibility();
    
    // Add listener
    scrollContainer.addEventListener('scroll', toggleVisibility as any);

    return () => {
      scrollContainer.removeEventListener('scroll', toggleVisibility as any);
    };
  }, []);

  const scrollToTop = () => {
    const mainContent = document.querySelector('main');
    const contentDiv = document.querySelector('[class*="overflow"]');
    
    if (mainContent && mainContent.scrollTop > 0) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (contentDiv && (contentDiv as HTMLElement).scrollTop > 0) {
      contentDiv.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 p-3.5 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white rounded-full shadow-2xl shadow-violet-500/50 transition-all duration-300 hover:scale-110 hover:shadow-violet-500/70 group"
      title="Scroll to Top"
      aria-label="Scroll to top"
    >
      <svg 
        className="w-6 h-6 transform group-hover:-translate-y-1 transition-transform duration-300" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2.5} 
          d="M5 10l7-7m0 0l7 7m-7-7v18" 
        />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
