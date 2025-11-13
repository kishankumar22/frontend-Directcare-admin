import { ReactNode } from "react";
import AdminLayoutComponent from "./AdminLayout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutComponent>{children}</AdminLayoutComponent>;
}
