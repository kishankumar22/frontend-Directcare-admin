"use client";

import { useEffect, useState } from "react";

export function useNewsletter() {
  const [isOpen, setIsOpen] = useState(false);
  const [checked, setChecked] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("newsletterEmail");

    if (!savedEmail) {
      setIsOpen(true);
      setChecked(true);
      return;
    }

    checkSubscription(savedEmail);
  }, []);

  async function checkSubscription(email: string) {
    try {
      const res = await fetch(
        `https://testapi.knowledgemarkg.com/api/Newsletter/check?email=${email}`
      );
      const data = await res.json();

      if (data?.data?.isSubscribed === false) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Check subscription error:", error);
    } finally {
      setChecked(true);
    }
  }

  async function submitEmail(email: string) {
    try {
      const res = await fetch(
        "https://testapi.knowledgemarkg.com/api/Newsletter/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            source: "Homepage",
            ipAddress: "0.0.0.0", // You can make dynamic later
          }),
        }
      );

      const data = await res.json();

    if (data.success) {
  localStorage.setItem("newsletterEmail", email);
  setSuccess("Successfully subscribed to newsletter 🎉");
  setError(null);

  setTimeout(() => {
    setIsOpen(false);
    setSuccess(null);
    setChecked(true);
  }, 1500);
}
 else {
  setError(data?.message ?? "Subscription failed");
}

  } catch (err) {
  setError("Something went wrong. Please try again.");
}

  }

 return {
  isOpen,
  checked,
  submitEmail,
  close: () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
  },
  error,
  success,
};

}
