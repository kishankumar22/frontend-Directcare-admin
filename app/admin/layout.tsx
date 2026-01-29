import { ReactNode } from "react";
import AdminLayoutComponent from "./AdminLayout";
import { ThemeProvider } from "@/context/theme-provider";
import { ToastProvider } from "@/components/CustomToast";

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
