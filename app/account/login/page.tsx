import { Suspense } from "react";
import AccountClient from "../AccountClient";

export default function AccountLoginPage() {
  return (
    <Suspense fallback={null}>
      <AccountClient />
    </Suspense>
  );
}
