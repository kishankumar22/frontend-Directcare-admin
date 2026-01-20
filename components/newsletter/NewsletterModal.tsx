"use client";

import { useState } from "react";

export default function NewsletterModal({
  isOpen,
  onClose,
  onSubmit,
  error,
  success,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  error?: string | null;
  success?: string | null;
}) {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    await onSubmit(email);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-2 text-center">
          Subscribe to our Newsletter
        </h2>
        <p className="text-sm text-gray-600 text-center mb-4">
          Get updates, news & offers directly in your inbox.
        </p>

        <input
          type="email"
          placeholder="Enter your email"
           className=" w-full px-4 py-2 mb-4 rounded-md text-sm border border-[#445D41] focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-[#445D41] "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
{error && (
  <p className="text-sm text-red-600 mb-2 text-center">
    {error}
  </p>
)}

{success && (
  <p className="text-sm text-green-600 mb-2 text-center">
    {success}
  </p>
)}
       <button
  onClick={handleSubmit}
  disabled={loading || !!success}
  className="w-full bg-[#445D41] text-white py-2 rounded-md hover:bg-black transition disabled:opacity-60"
>

          {loading ? "Submitting..." : "Subscribe"}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
