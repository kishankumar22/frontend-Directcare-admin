"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoyaltyRedemptionBox({
  orderTotal,
  onApply,
  onRemove,
}: {
  orderTotal: number;
  onApply: (points: number, discount: number) => void;
  onRemove: () => void;
}) {
  const { accessToken, isAuthenticated } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [pointsInput, setPointsInput] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  // ✅ FETCH BALANCE
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${API_BASE_URL}/api/loyalty/balance`, { headers })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.hasAccount) {
          setBalance(res.data.currentBalance);
        }
      });
  }, [isAuthenticated, accessToken]);

  // ✅ CALCULATE (DRY RUN)
  useEffect(() => {
   if (!pointsInput || !accessToken) return;

    const t = setTimeout(async () => {
      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/api/loyalty/redeem/calculate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            pointsToRedeem: pointsInput,
            orderAmount: orderTotal,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setPreview(data.data);
      }

      setLoading(false);
    }, 400);

    return () => clearTimeout(t);
 }, [pointsInput, orderTotal, accessToken]);

  const handleApply = () => {
    if (!preview?.canRedeem) return;

    setApplied(true);
    onApply(pointsInput, preview.discountAmount);
  };

  const handleRemove = () => {
    setApplied(false);
    setPointsInput(0);
    setPreview(null);
    onRemove();
  };

  if (!isAuthenticated || !balance || balance === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-amber-50 mt-3">
      <h3 className="font-semibold text-amber-800 mb-2">
        🎁 Redeem Loyalty Points
      </h3>

      <p className="text-sm text-gray-600 mb-2">
        {balance.toLocaleString()} points available
      </p>

      {!applied ? (
        <>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min={500}
              value={pointsInput || ""}
              onChange={(e) => setPointsInput(Number(e.target.value))}
              className="border px-2 py-1 rounded text-sm w-full"
              placeholder="Enter points to redeem"
            />
          </div>

          {preview && (
            <div
              className={`text-sm ${
                preview.canRedeem ? "text-green-700" : "text-red-600"
              }`}
            >
              {preview.canRedeem
                ? `£${preview.discountAmount} discount`
                : preview.cannotRedeemReason}
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={!preview?.canRedeem || loading}
            className="w-full mt-2 bg-amber-500 text-white py-1.5 rounded text-sm"
          >
            {loading ? "Calculating..." : "Apply Points"}
          </button>
        </>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-green-700 text-sm">
            ✓ Applied ({pointsInput} pts)
          </span>
          <button
            onClick={handleRemove}
            className="text-red-500 text-xs underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}