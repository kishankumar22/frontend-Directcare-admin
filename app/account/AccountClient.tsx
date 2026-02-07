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
const [regFieldErrors, setRegFieldErrors] = useState<{
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
}>({});


  const [loading, setLoading] = useState(false);

  // Shake animation
  const [shake, setShake] = useState(false);
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };
  const getPasswordStrength = (password: string) => {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score === 2) return "medium";
  return "strong";
};

const isValidPassword = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[!@#$%^&*(),.?":{}|<>]/.test(password);


  // Validations
 const validateEmail = () => {
  setEmailError("");

  const value = email.trim();

  if (!value) {
    setEmailError("Email is required.");
    triggerShake();
    return false;
  }

  // ❌ double dots anywhere (esp end)
  if (value.includes("..")) {
    setEmailError("Enter a valid email address.");
    triggerShake();
    return false;
  }

  // basic but safe regex
  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(value)) {
    setEmailError("Enter a valid email address.");
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
setRegFieldErrors({});

const errors: any = {};

if (!regFirstName.trim())
  errors.firstName = "First name is required";

// ❌ last name mandatory nahi — NO VALIDATION

if (!regEmail.trim())
  errors.email = "Email is required";
else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim()))
  errors.email = "Enter a valid email";

if (!regPassword)
  errors.password = "Password is required";
else if (!isValidPassword(regPassword))
  errors.password =
    "Password must be at least 8 characters, contain 1 uppercase & 1 special character";


if (!regPhone.trim())
  errors.phone = "Phone number is required";
else if (!/^\d{8,15}$/.test(regPhone.trim()))
  errors.phone = "Enter a valid phone number";

if (Object.keys(errors).length) {
  setRegFieldErrors(errors);
  triggerShake();
  return;
}


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
  <div className="min-h-screen relative overflow-hidden bg-[#445D41] py-8 px-4">
  {/* GRID */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.15]"
    style={{
      backgroundImage: `
        linear-gradient(to right, rgba(255,255,255,0.15) 3px, transparent 3px),
        linear-gradient(to bottom, rgba(255,255,255,0.15) 3px, transparent 3px)
      `,
      backgroundSize: "52px 52px",
    }}
  />

  {/* BOTTOM BLACK FADE */}
  <div
    className="pointer-events-none absolute inset-0
      bg-gradient-to-b from-transparent via-transparent to-black"
  />
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT SIDE — GUEST CHECKOUT */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Continue as Guest</h2>
          <p className="text-sm text-gray-500 mt-1">
            Checkout securely using just your email address.
          </p>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-gray-700">Email address *</label>

            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
             onChange={(e) => {
  setEmail(e.target.value);

  // user type kare to error clear ho
  if (emailError) setEmailError("");
}}

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
{/* REGISTER */}
<TabsContent value="register">
  <form className="space-y-4" onSubmit={handleRegister}>
    <div className="grid grid-cols-2 gap-4">
      {/* First Name (Required) */}
      <div>
        <label className="text-sm font-medium">
          First Name <span className="text-red-500">*</span>
        </label>
        <Input
          value={regFirstName}
          onChange={(e) => {
            setRegFirstName(e.target.value);
            if (regFieldErrors.firstName) {
              setRegFieldErrors((p) => ({ ...p, firstName: undefined }));
            }
          }}
          className="h-11"
        />
        {regFieldErrors.firstName && (
          <p className="text-xs text-red-600 mt-1">
            {regFieldErrors.firstName}
          </p>
        )}
      </div>

      {/* Last Name (Optional) */}
      <div>
        <label className="text-sm font-medium">
          Last Name
        </label>
        <Input
          value={regLastName}
          onChange={(e) => setRegLastName(e.target.value)}
          className="h-11"
        />
      </div>
    </div>

    {/* Email (Required) */}
    <div>
      <label className="text-sm font-medium">
        Email <span className="text-red-500">*</span>
      </label>
     <Input
  type="email"
  value={regEmail}
  onChange={(e) => {
    setRegEmail(e.target.value);

    // typing pe error clear
    if (regFieldErrors.email) {
      setRegFieldErrors((p) => ({ ...p, email: undefined }));
    }
  }}
  onBlur={() => {
    // field chhodte hi validate
    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegFieldErrors((p) => ({
        ...p,
        email: "Enter a valid email address",
      }));
    }
  }}
  className="h-11"
/>

      {regFieldErrors.email && (
        <p className="text-xs text-red-600 mt-1">
          {regFieldErrors.email}
        </p>
      )}
    </div>

    {/* Password (Required) */}
    <div>
      <label className="text-sm font-medium">
        Password <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Input
          type={showRegPassword ? "text" : "password"}
          value={regPassword}
          onChange={(e) => {
            setRegPassword(e.target.value);
            if (regFieldErrors.password) {
              setRegFieldErrors((p) => ({ ...p, password: undefined }));
            }
          }}
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
      {regFieldErrors.password && (
        <p className="text-xs text-red-600 mt-1">
          {regFieldErrors.password}
        </p>
      )}
      {regPassword && !regFieldErrors.password && (
  <div className="mt-2">
    <div className="h-1.5 w-full bg-gray-200 rounded">
      <div
        className={clsx(
          "h-1.5 rounded transition-all",
          getPasswordStrength(regPassword) === "weak" &&
            "w-1/3 bg-red-500",
          getPasswordStrength(regPassword) === "medium" &&
            "w-2/3 bg-yellow-500",
          getPasswordStrength(regPassword) === "strong" &&
            "w-full bg-green-600"
        )}
      />
    </div>

    <p className="text-xs mt-1 text-gray-600">
      Strength:{" "}
      <span
        className={clsx(
          "font-semibold",
          getPasswordStrength(regPassword) === "weak" && "text-red-600",
          getPasswordStrength(regPassword) === "medium" && "text-yellow-600",
          getPasswordStrength(regPassword) === "strong" && "text-green-600"
        )}
      >
        {getPasswordStrength(regPassword)}
      </span>
    </p>
  </div>
)}

    </div>

    {/* Phone Number (Required) */}
    <div>
      <label className="text-sm font-medium">
        Phone Number <span className="text-red-500">*</span>
      </label>
    <Input
  value={regPhone}
  inputMode="numeric"
  onChange={(e) => {
    // sirf digits allow
    const onlyDigits = e.target.value.replace(/\D/g, "");

    // max 10 digits
    if (onlyDigits.length > 10) return;

    setRegPhone(onlyDigits);

    if (regFieldErrors.phone) {
      setRegFieldErrors((p) => ({ ...p, phone: undefined }));
    }
  }}
  className="h-11"
/>

      {regFieldErrors.phone && (
        <p className="text-xs text-red-600 mt-1">
          {regFieldErrors.phone}
        </p>
      )}
    </div>

    {/* Gender (Optional) */}
    <select
      value={regGender}
      onChange={(e) => setRegGender(e.target.value)}
      className="w-full h-11 border px-3 rounded-lg"
    >
      <option value="male">Male</option>
      <option value="female">Female</option>
    </select>

    {/* Backend error */}
    {regError && (
      <p className="text-sm text-red-600">
        {regError}
      </p>
    )}

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
