import { ReactNode } from "react";
import AdminLayoutComponent from "./AdminLayout";
import { ThemeProvider } from "@/context/theme-provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AdminLayoutComponent>
        {children}
      </AdminLayoutComponent>
    </ThemeProvider>
  );
}
