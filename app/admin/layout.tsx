import { ReactNode } from "react";
import AdminLayoutComponent from "./AdminLayout";
import { ThemeProvider } from "@/app/admin/_context/theme-provider";
import { ToastProvider } from "@/app/admin/_components/CustomToast";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
     <ToastProvider>
       <ThemeProvider>
        <AdminLayoutComponent>
        {children}
        </AdminLayoutComponent>
     </ThemeProvider>
    </ToastProvider>
  );
}
