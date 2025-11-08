"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

export default function ClientLayout({
  children,
  categories,
}: {
  children: React.ReactNode;
  categories: any[];
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Client-side only mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ye routes par layout nahi dikhana
  const hideLayoutRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/onboarding",
    "/checkout",
    "/payment-success",
    "/payment-failed"
  ];

  const hideLayout = 
    hideLayoutRoutes.includes(pathname) || 
    pathname.startsWith("/admin");

  // Agar client mount nahi hua → SSR-safe fallback
  if (!mounted) {
    return (
      <>
        <Header ssrCategories={categories} />
        <main>{children}</main>
        <Footer />
      </>
    );
  }

  return (
    <>
      {!hideLayout && <Header ssrCategories={categories} />}
      <main className={hideLayout ? "min-h-screen" : ""}>
        {children}
      </main>
      {!hideLayout && <Footer />}
    </>
  );
}