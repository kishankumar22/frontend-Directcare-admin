// Account ka page.tsx ka working code (Premium UI Version)

"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx";
import { useCart } from "@/context/CartContext";

import { useAuth } from "@/context/AuthContext";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";



export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get("from") === "checkout";

  const { cart } = useCart();
const [showPassword, setShowPassword] = useState(false);
const [showRegPassword, setShowRegPassword] = useState(false);


  const { login, register } = useAuth();

  // Guest Email
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  // Login Errors
  const [loginError, setLoginError] = useState("");

  // Register State
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

  // Guest validation
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


  // Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); // reset error
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);

      if (fromCheckout) router.push("/checkout");
      else router.push("/account/profile");
    } catch (error: any) {
      // DEBUG alert to see backend actual response
      // alert("LOGIN ERROR: " + JSON.stringify(error, null, 2));

      // Backend se aa raha message show karo
      setLoginError(error?.message || "Invalid email or password");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // Register Submit
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

      if (fromCheckout) router.push("/checkout");
      else router.push("/account/profile");
    } catch (error: any) {
      // alert("REGISTER ERROR: " + JSON.stringify(error, null, 2));

      const msg = error?.errors?.[0] || "Registration failed";
      setRegError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

 
return (
  <div className="min-h-screen bg-gray-50 py-8 px-4">
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* LEFT: CONTINUE AS GUEST */}
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
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            className={clsx(
              "h-11 px-3 bg-white border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-[#445D41]/60",
              emailError && "border-red-500 ring-2 ring-red-200",
              shake && "animate-shake"
            )}
          />

          {emailError && (
            <p className="text-red-600 text-xs mt-1">{emailError}</p>
          )}

          <Button
            className="w-full h-11 mt-2 bg-[#445D41] hover:bg-black text-white text-sm rounded-lg"
            onClick={handleGuestContinue}
          >
            Continue to checkout
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">
          We’ll use this email to send your order updates and receipt.
        </p>
      </div>

      {/* RIGHT: LOGIN + REGISTER TABS */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 border-b mb-4">
            <TabsTrigger value="login" className="py-2 text-sm">Login</TabsTrigger>
            <TabsTrigger value="register" className="py-2 text-sm">Register</TabsTrigger>
          </TabsList>

          {/* LOGIN FORM */}
          <TabsContent value="login">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Login</h3>
              <p className="text-xs text-gray-500 mt-1">
                Already have an account? Sign in to access your orders.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="h-11 rounded-lg border-gray-300 bg-white focus-visible:ring-2 focus-visible:ring-[#445D41]/60"
                />
              </div>

              <div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">Password</label>
  <div className="relative">
    <Input
      type={showPassword ? "text" : "password"}
      placeholder="Enter your password"
      value={loginPassword}
      onChange={(e) => setLoginPassword(e.target.value)}
      className="h-11 rounded-lg border-gray-300 bg-white pr-10 focus-visible:ring-2 focus-visible:ring-[#445D41]/60 focus-visible:border-[#445D41]"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>


              {loginError && (
                <p className="text-red-600 text-sm font-medium mt-1">
                  {loginError}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#445D41] hover:bg-black text-white text-sm rounded-lg mt-1"
              >
                {loading ? "Please wait..." : "Login"}
              </Button>
            </form>
          </TabsContent>

          {/* REGISTER FORM */}
          <TabsContent value="register">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create an account</h3>
              <p className="text-xs text-gray-500 mt-1">
                Track orders & get faster checkout next time.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <Input
                    placeholder="Enter your first name"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    required
                    className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#445D41]/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <Input
                    placeholder="Enter your last name"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    required
                    className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#445D41]/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#445D41]/60"
                />
              </div>

             <div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">Password</label>
  <div className="relative">
    <Input
      type={showRegPassword ? "text" : "password"}
      placeholder="Create a strong password"
      value={regPassword}
      onChange={(e) => setRegPassword(e.target.value)}
      className="h-11 rounded-lg border-gray-300 bg-white pr-10 focus-visible:ring-2 focus-visible:ring-[#445D41]/60 focus-visible:border-[#445D41]"
    />

    <button
      type="button"
      onClick={() => setShowRegPassword(!showRegPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
    >
      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>

  <p className="text-[11px] text-gray-400">
    Must have atleast one uppercase, atleast one digit, length should be greater than 6.
  </p>
</div>


              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <Input
                  placeholder="Enter your phone number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                  className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#445D41]/60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="w-full h-11 border border-gray-300 rounded-lg px-3"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {regError && (
                <p className="text-red-600 text-sm font-medium mt-1">{regError}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#445D41] hover:bg-black text-white text-sm rounded-lg mt-1"
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
