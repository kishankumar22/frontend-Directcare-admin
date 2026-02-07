"use client";

import { LoyaltyPoints } from "@/context/AuthContext";
import {
  Gift,
  Trophy,
  TrendingUp,
  ArrowUpRight,
  Crown,
  Medal,
  ShieldCheck,
} from "lucide-react";

interface Props {
  loyalty?: LoyaltyPoints;
}

const formatDate = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StatCard = ({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}) => (
  <div className={`border rounded-xl p-5 shadow-sm ${className}`}>
    <div className="flex items-center gap-2 text-sm text-gray-500">
      {icon}
      {label}
    </div>
    <div className="text-xl font-semibold text-gray-900 mt-2">
      {value}
    </div>
  </div>
);

export default function LoyaltyPointsTab({ loyalty }: Props) {
  if (!loyalty) {
    return (
      <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
        Loyalty points information is not available.
      </div>
    );
  }

  const {
    currentBalance,
    redemptionValue,
    totalPointsEarned,
    totalPointsRedeemed,
    totalPointsExpired,
    tierLevel,
    pointsToNextTier,
    lastEarnedAt,
    lastRedeemedAt,
  } = loyalty;

  /* 🎨 Tier styling */
  const tierConfig = {
    Gold: {
      bg: " bg-gradient-to-br from-[#f3e7c3] via-[#e2c66f] to-[#c9a227] text-black",
      badge: "bg-yellow-100 text-yellow-800",
      icon: <Crown size={18} />,
      label: "Gold Member",
    },
    Silver: {
      bg: "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900",
      badge: "bg-gray-100 text-gray-700",
      icon: <Medal size={18} />,
      label: "Silver Member",
    },
    Bronze: {
      bg: "bg-gradient-to-br from-amber-700 to-amber-800 text-white",
      badge: "bg-amber-100 text-amber-800",
      icon: <ShieldCheck size={18} />,
      label: "Bronze Member",
    },
  }[tierLevel];

  return (
    <div className="space-y-2">
      {/* HEADER */}
     <div className="bg-[#445D41] border rounded-xl p-6 shadow-sm flex items-center justify-between">
  <div>
    <div className="flex items-center gap-2">
      <Trophy className="text-white" size={25} />
      <h2 className="text-lg font-semibold text-white">
        Loyalty Points
      </h2>
    </div>

    <p className="text-sm text-white mt-1 leading-snug">
      Earn points on every purchase and redeem them for rewards
    </p>
  </div>

  <span
    className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide ${tierConfig.badge}`}
  >
    {tierLevel} Member
  </span>
</div>


      {/* 🔥 TOP ROW – 3 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* membership */}
     
  <div
          className={`rounded-xl p-6 shadow-sm flex flex-col justify-between ${tierConfig.bg}`}
        >
          <div className="flex items-center gap-2 opacity-90">
            {tierConfig.icon}
            <span className="text-sm font-medium">
              Membership
            </span>
          </div>

          <div className="mt-4">
            <div className="text-xl font-semibold">
              {tierConfig.label}
            </div>
            <div className="text-sm opacity-90 mt-1">
              Premium customer benefits unlocked
            </div>
          </div>
        </div>
       <div className="bg-white text-[#445D41] rounded-xl p-6 shadow-sm">
  <div className="flex items-center gap-2 text-[#445D41]">
    <ArrowUpRight size={18} />
    Redemption Value
  </div>
  <div className="text-3xl font-bold mt-3">
    £{redemptionValue.toFixed(2)}
  </div>
</div>

       

        {/* 🟡 current points */}
         <div className="bg-white text-[#445D41] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#445D41]">
            <Gift size={18} />
            Current Balance
          </div>
          <div className="text-3xl font-bold mt-3">
            {currentBalance.toLocaleString()} pts
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Points Earned"
          value={totalPointsEarned.toLocaleString()}
          className="bg-white"
        />
        <StatCard
          label="Points Redeemed"
          value={totalPointsRedeemed.toLocaleString()}
          className="bg-white"
        />
        <StatCard
          label="Points Expired"
          value={totalPointsExpired.toLocaleString()}
          className="bg-white"
        />
       
      </div>

    <div className="bg-white border rounded-xl p-6 shadow-sm">
  <h3 className="text-sm font-medium text-gray-700 mb-4">
    Activity Timeline
  </h3>

  <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    {/* 🔹 Vertical divider */}
    <div className="hidden md:block absolute left-1/2 top-0 h-full w-px bg-gray-200" />

    <div className="flex justify-between pr-6">
      <span className="text-[#445D41]">Last Earned</span>
      <span className="font-medium">
        {formatDate(lastEarnedAt)}
      </span>
    </div>

    <div className="flex justify-between pl-6">
      <span className="text-[#445D41]">Last Redeemed</span>
      <span className="font-medium">
        {formatDate(lastRedeemedAt)}
      </span>
    </div>
  </div>
</div>

    </div>
  );
}
