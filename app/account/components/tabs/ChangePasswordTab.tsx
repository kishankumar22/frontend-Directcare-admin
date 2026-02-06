"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/admin/_context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function ChangePasswordTab() {
  const { accessToken, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
const [showCurrent, setShowCurrent] = useState(false);
const [showNew, setShowNew] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "https://testapi.knowledgemarkg.com/api/Auth/change-password",
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

      // 🔐 production standard: force re-login
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

      <div className="space-y-4">
        {/* CURRENT PASSWORD */}
       <div className="relative">
  <label className="text-sm font-medium">Current Password</label>

  <input
    type={showCurrent ? "text" : "password"}
    value={currentPassword}
    onChange={(e) => setCurrentPassword(e.target.value)}
    className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-[#445D41]" />

  <button
    type="button"
    onClick={() => setShowCurrent(!showCurrent)}
    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
  >
    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
</div>


        {/* NEW PASSWORD */}
      <div className="relative">
  <label className="text-sm font-medium">New Password</label>

  <input
    type={showNew ? "text" : "password"}
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 text-sm
      focus:ring-2 focus:ring-[#445D41]"
  />

  <button
    type="button"
    onClick={() => setShowNew(!showNew)}
    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
  >
    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>

  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters.</p>
</div>


        {/* CONFIRM PASSWORD */}
       <div className="relative">
  <label className="text-sm font-medium">Confirm New Password</label>

  <input
    type={showConfirm ? "text" : "password"}
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="mt-1 w-full rounded-lg border px-3 py-2 pr-10 text-sm
      focus:ring-2 focus:ring-[#445D41]"
  />

  <button
    type="button"
    onClick={() => setShowConfirm(!showConfirm)}
    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
  >
    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
</div>

        {/* ERROR */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            Password changed successfully. Redirecting to login…
          </div>
        )}

        {/* ACTION */}
        <div className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#445D41]"
          >
            {loading ? "Updating…" : "Change Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
