"use client";

import React from 'react';
import { ToastProvider as CustomToastProvider, ToastContainer } from './CustomToast';

interface ToastProviderProps {
  children: React.ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {
  return (
    <CustomToastProvider>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        pauseOnHover={true}
        draggable={true}
        limit={5}
      />
    </CustomToastProvider>
  );
}