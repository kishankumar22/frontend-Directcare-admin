"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ConditionalLayout({
  children,
  categories,
}: {
  children: React.ReactNode;
  categories: any[];
}) {
  const pathname = usePathname();

  // Routes jahan Header/Footer NAHI chahiye
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

  // ✅ Admin routes ko completely exclude karo (NULL SAFE)
  const isAdminRoute = pathname?.startsWith("/admin") || false;
  const isAuthRoute = pathname ? hideLayoutRoutes.includes(pathname) : false;
  
  const hideLayout = isAdminRoute || isAuthRoute;

  // ✅ Admin ya Auth routes par Header/Footer NAHI dikhega
  if (hideLayout) {
    return <>{children}</>;
  }

  // ✅ Main site par Header + Footer dikhega
  return (
    <>
      <Header ssrCategories={categories} />
      <main className="pt-[150px]">{children}</main>
      <Footer />
    </>
  );
}
