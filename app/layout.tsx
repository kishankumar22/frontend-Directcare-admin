import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { ToastProvider } from "@/components/CustomToast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Direct Care | E-Commerce Platform",
  description: "Shop healthcare and wellness products online at great prices.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // ✅ SSR FETCH CATEGORIES
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
    { cache: "no-store" }
  );

  const json = await res.json();

  const categories = json.success
    ? json.data.filter((c: any) => !c.parentCategoryId)
    : [];

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* ✅ Passing categories SSR → ClientLayout */}
        <ToastProvider>
        <ClientLayout categories={categories}>{children}</ClientLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
