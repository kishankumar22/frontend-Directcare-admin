"use client";

import {
  Mail,
  Phone,
  User,
  Calendar,
  Clock,
  ShoppingBag,
  PoundSterling,
  ShieldCheck,
  User2,
} from "lucide-react";
import Stat from "../ui/Stat";
import Detail from "../ui/Detail";

export default function ProfileTab({ user, initials }: any) {
  return (
    <div className="space-y-2">

      {/* PROFILE HEADER */}
      <div className="relative overflow-hidden rounded-2xl border shadow-sm bg-gradient-to-br from-[#445D41] to-black p-6 text-white">
        {/* GRID OVERLAY */}
  <div
    className="absolute inset-0 opacity-[0.15]"
    style={{
      backgroundImage: `
        linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
      `,
      backgroundSize: "42px 42px",
    }}
  />
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/15 flex items-center justify-center text-xl font-bold uppercase">
            {initials}
          </div>

          <div>
            <p className="text-xl text-white font-semibold leading-tight">
              {user.fullName || `${user.firstName} ${user.lastName}`}
            </p>
            <p className="text-sm text-white/80 flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>
        </div>

        {/* STATUS BADGE */}
        {user.isActive && (
          <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs text-white">
            <ShieldCheck className="h-4 w-4" />
            Active Account
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          icon={<ShoppingBag className="h-6 w-6 text-white" />}
          label="Total Orders"
          value={user.totalOrders ?? 0}
        />

        <Stat
          icon={<PoundSterling className="h-6 w-6 text-white" />}
          label="Total Spent"
          value={`£${user.totalSpent?.toFixed(2) ?? "0.00"}`}
        />

        <Stat
          icon={<Calendar className="h-6 w-6 text-white" />}
          label="Member Since"
          value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "-"
          }
        />
      </div>

      {/* DETAILS */}
      <div className="bg-white rounded-xl border shadow-sm divide-y">
        <Detail
          icon={<User2 className="h-4 w-4 text-[#445D41]" />}
          label="Full name"
          value= {user.fullName || `${user.firstName} ${user.lastName}`}
        />
        <Detail
          icon={<Mail className="h-4 w-4 text-[#445D41]" />}
          label="Email"
          value={user.email}
        />

        <Detail
          icon={<Phone className="h-4 w-4 text-[#445D41]" />}
          label="Phone"
          value={user.phoneNumber || "-"}
        />

        <Detail
          icon={<User className="h-4 w-4 text-[#445D41]" />}
          label="Gender"
          value={user.gender || "-"}
        />

        <Detail
          icon={<Calendar className="h-4 w-4 text-[#445D41]" />}
          label="Date of Birth"
          value={
            user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString()
              : "-"
          }
        />

        <Detail
          icon={<Clock className="h-4 w-4 text-[#445D41]" />}
          label="Last Login"
          value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleDateString()
              : "-"
          }
        />
      </div>
    </div>
  );
}
