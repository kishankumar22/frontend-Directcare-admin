import type { Metadata } from "next";

import "./globals.css";
import { ToastProvider } from "@/components/toast/CustomToast";
import ConditionalLayout from "./ConditionalLayout";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";



export const metadata: Metadata = {
  title: "Direct Care | E-Commerce Platform",
  description: "Shop healthcare and wellness products online at great prices.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let categories: any[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
      {
        next: { revalidate: 600 }, // ⭐ FIXED — NO MORE DYNAMIC SERVER ERROR
      }
    );
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        categories = json.data.filter((c: any) => !c.parentCategoryId);
      }
    }
  } catch (error) {
    console.error("❌ Categories API failed:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link
  href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap"
  rel="stylesheet"
/>
  </head>
     <body suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <ConditionalLayout categories={categories}>
                  {children}
                </ConditionalLayout>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
