"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/app/admin/_context/AuthContext";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import AccountDashboard from "./components/AccountDashboard";

export default function AccountClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get("from") === "checkout";
  const fromBuyNow = searchParams.get("from") === "buy-now";
  const { cart } = useCart();
 const { login, register, isAuthenticated, user } = useAuth();


  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Guest Email
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regGender, setRegGender] = useState("male");
  const [regError, setRegError] = useState("");

  const [loading, setLoading] = useState(false);

  // Shake animation
  const [shake, setShake] = useState(false);
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Validations
  const validateEmail = () => {
    setEmailError("");
    if (!email.trim()) {
      setEmailError("Email is required.");
      triggerShake();
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email.");
      triggerShake();
      return false;
    }
    return true;
  };

  const handleGuestContinue = () => {
    setEmailError("");

    if (cart.some((c) => c.type === "subscription")) {
      setEmailError("Please login to purchase subscription products.");
      return;
    }

    if (!validateEmail()) return;

    localStorage.setItem("guestEmail", email);
    router.push("/checkout");
  };

  // LOGIN SUBMIT
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
   if (fromCheckout || fromBuyNow) {
  router.replace("/checkout");
} else {
  router.replace("/account");
}



    } catch (error: any) {
      setLoginError(error?.message || "Invalid email or password");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // REGISTER SUBMIT
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName,
        lastName: regLastName,
        phoneNumber: regPhone,
        dateOfBirth: new Date().toISOString(),
        gender: regGender,
        requireEmailConfirmation: true,
      });

  if (fromCheckout || fromBuyNow) {
  router.replace("/checkout");
} else {
  router.replace("/account");
}


    } catch (error: any) {
      const msg = error?.errors?.[0] || "Registration failed";
      setRegError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };
// 🔐 If user is logged in, show dashboard instead of login
if (isAuthenticated && user) {
  return <AccountDashboard />;
}


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT SIDE — GUEST CHECKOUT */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Continue as Guest</h2>
          <p className="text-sm text-gray-500 mt-1">
            Checkout securely using just your email address.
          </p>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-gray-700">Email address</label>

            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              className={clsx(
                "h-11 px-3 bg-white border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-[#445D41]/60",
                emailError && "border-red-500 ring-2 ring-red-200",
                shake && "animate-shake"
              )}
            />

            {emailError && <p className="text-red-600 text-xs mt-1">{emailError}</p>}

            <Button
              className="w-full h-11 mt-2 bg-[#445D41] hover:bg-black text-white text-sm rounded-lg"
              onClick={handleGuestContinue}
            >
              Continue to checkout
            </Button>
          </div>
        </div>

        {/* RIGHT SIDE — LOGIN & REGISTER */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 border-b mb-4">
              <TabsTrigger value="login" className="py-2 text-sm">Login</TabsTrigger>
              <TabsTrigger value="register" className="py-2 text-sm">Register</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-11 border-gray-300 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-11 pr-10 border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {loginError && <p className="text-red-600 text-sm">{loginError}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#445D41] hover:bg-black text-white rounded-lg"
                >
                  {loading ? "Please wait..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    className="h-11"
                  />
                  <Input
                    placeholder="Last Name"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <Input
                  placeholder="Email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="h-11"
                />

                <div className="relative">
                  <Input
                    type={showRegPassword ? "text" : "password"}
                    placeholder="Create Password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Input
                  placeholder="Phone Number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="h-11"
                />

                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="w-full h-11 border px-3 rounded-lg"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                {regError && <p className="text-red-600 text-sm">{regError}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#445D41] hover:bg-black text-white rounded-lg"
                >
                  {loading ? "Please wait…" : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
