import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/CustomToast";
import ConditionalLayout from "./ConditionalLayout";
import { CartProvider } from "@/context/CartContext";  // <-- IMPORT THIS
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

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
      { cache: "no-store" }
    );

    if (res.ok) {
      let json = null;
      try {
        json = await res.json();
      } catch (err) {
        console.error("❌ JSON parse failed:", err);
      }

      if (json?.success && Array.isArray(json.data)) {
        categories = json.data.filter((c: any) => !c.parentCategoryId);
      }
    }
  } catch (error) {
    console.error("❌ Categories API failed:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>
          <CartProvider>            
            <ConditionalLayout categories={categories}>
              {children}
            </ConditionalLayout>
          </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
