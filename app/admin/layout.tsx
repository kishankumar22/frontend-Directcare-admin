import { ReactNode } from "react";
import AdminLayoutComponent from "./AdminLayout";
import { ThemeProvider } from "@/app/admin/_context/theme-provider";
import { AuthProvider } from "@/app/admin/_context/auth-context";
import { ToastProvider } from "@/app/admin/_components/CustomToast";
import { QueryProvider } from "@/app/admin/_components/QueryProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <AdminLayoutComponent>
              {children}
            </AdminLayoutComponent>
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
