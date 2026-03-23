"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";


export default function ChangePasswordTab() {
  const { accessToken, logout, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");


  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 🔐 Real-time validation
  const passwordChecks = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.special;

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please meet all password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const json = await res.json();

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Current password is incorrect");
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        logout();
        window.location.replace("/account");
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 max-w-xl">
      <h2 className="text-xl font-semibold mb-1">Change Password</h2>
      <p className="text-sm text-gray-600 mb-6">
        For security reasons, you’ll be logged out after changing your password.
      </p>

     <form autoComplete="off" className="space-y-4">
{/* 🔥 Autofill Hack */}
<input
  type="text"
  name="username"
  autoComplete="username"
  className="hidden"
/>
<input
  type="password"
  name="password"
  autoComplete="current-password"
  className="hidden"
/>
        {/* CURRENT PASSWORD */}
        <div className="relative">
          <label className="text-sm font-medium">Current Password*</label>
       <input
  type={showCurrent ? "text" : "password"}
  value={currentPassword}
  onChange={(e) => setCurrentPassword(e.target.value)}
  name="new-pass-field"              // 🔥 random name
  autoComplete="new-password"       // 🔥 important
  data-lpignore="true"
  data-form-type="other"
  readOnly
  onFocus={(e) => e.target.removeAttribute("readonly")}
  className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#445D41]"
/>
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-9 text-gray-500"
          >
            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* NEW PASSWORD */}
        <div className="relative">
          <label className="text-sm font-medium">New Password*</label>
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#445D41]"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-9 text-gray-500"
          >
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* 🔥 Inline Validation */}
          <div className="mt-2 text-xs flex flex-wrap gap-3">
            <span className={passwordChecks.length ? "text-green-600" : "text-gray-400"}>
              8+ chars
            </span>
            <span className={passwordChecks.uppercase ? "text-green-600" : "text-gray-400"}>
              1 Uppercase
            </span>
            <span className={passwordChecks.lowercase ? "text-green-600" : "text-gray-400"}>
              1 Lowercase
            </span>
            <span className={passwordChecks.special ? "text-green-600" : "text-gray-400"}>
              1 Special
            </span>
          </div>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="relative">
          <label className="text-sm font-medium">Confirm New Password*</label>
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#445D41]"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-9 text-gray-500"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {confirmPassword.length > 0 && (
            <p className={passwordsMatch ? "text-green-600 text-xs mt-2" : "text-red-600 text-xs mt-2"}>
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          )}
        </div>

        {/* Forgot */}
    

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

      
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            Password changed successfully. Redirecting to login…
          </div>
        )}

        <div className="pt-0">
          <Button
            onClick={handleSubmit}
            disabled={loading || !isPasswordValid || !passwordsMatch}
            className="w-full bg-[#445D41]"
          >
            {loading ? "Updating…" : "Change Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
