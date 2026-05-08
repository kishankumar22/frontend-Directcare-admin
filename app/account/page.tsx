//account/page.tsx
import { Suspense } from "react";
import AccountClient from "./AccountClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-600">Loading…</div>}>
      <AccountClient />
    </Suspense>
  );
}
