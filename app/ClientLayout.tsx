"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ClientLayout({
  children,
  categories,
}: {
  children: React.ReactNode;
  categories: any[];
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <Header ssrCategories={categories} />}
      <main>{children}</main>
      {!isAdminRoute && <Footer />}
    </>
  );
}
