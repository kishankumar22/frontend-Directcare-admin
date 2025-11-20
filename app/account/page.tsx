"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx"; // ⭐ for shake animation

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const router = useRouter();

  // ⭐ Smooth shake animation trigger
  const [shake, setShake] = useState(false);

  const validateEmail = () => {
    setEmailError("");

    if (!email.trim()) {
      setEmailError("Email is required.");
      triggerShake();
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address.");
      triggerShake();
      return false;
    }

    return true;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500); // animation reset
  };

  const handleGuestContinue = () => {
    if (!validateEmail()) return;

    localStorage.setItem("guestEmail", email);
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* ⭐ TOP SECTION — Continue as Guest */}
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 mb-12 text-center border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Continue as Guest
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your email to continue checkout without creating an account.
        </p>

        <div className="flex flex-col gap-1">
          {/* ⭐ Email Input with Premium UI */}
          <div className="relative w-full">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(""); // live reset
              }}
              className={clsx(
                "w-full h-11 px-3 transition-all border-gray-300 bg-white",
                emailError &&
                  "border-red-500 ring-2 ring-red-200 focus:border-red-600",
                shake && "animate-shake"
              )}
            />
          </div>

          {/* ⭐ Error Text */}
          {emailError && (
            <p className="text-red-600 text-xs mt-1">{emailError}</p>
          )}

          {/* ⭐ Button */}
          <Button
            className="w-full mt-3 bg-[#445D41] hover:bg-black text-white h-11 rounded-lg text-sm font-medium"
            onClick={handleGuestContinue}
          >
            Continue as Guest
          </Button>
        </div>
      </div>

      {/* ⭐ LOGIN + REGISTER FORMS */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LOGIN FORM */}
        <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Login</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Password
              </label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full bg-[#445D41] hover:bg-black text-white">
              Login
            </Button>
            <div className="text-right">
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>
          </form>
        </div>

        {/* REGISTER FORM */}
        <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Register</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Full Name
              </label>
              <Input type="text" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Password
              </label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full bg-[#445D41] hover:bg-black text-white">
              Create Account
            </Button>
          </form>
        </div>
      </div>

      {/* ⭐ Shake keyframes */}
      <style>{`
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes shake {
          0% { transform: translateX(0px); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0px); }
        }
      `}</style>
    </div>
  );
}
