"use client";

import { useState } from "react";

export default function NewsletterModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
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
          className="w-full border px-4 py-2 rounded-md mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
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
