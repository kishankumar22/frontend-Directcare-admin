"use client";

import { Shield, Database, Lock, UserCheck, Mail } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-16 text-center px-4">
        <h1 className="text-3xl md:text-5xl font-bold">
          Privacy Policy
        </h1>
        <p className="mt-3 opacity-90 max-w-2xl mx-auto">
          Your privacy and data protection are important to us.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* INTRO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-600">
            Direct Care is committed to protecting your personal information and
            complying with UK data protection laws.
          </p>
        </div>

        {/* DATA COLLECTION */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Database className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Data We Collect</h2>
          </div>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>Name, email, and contact details</li>
            <li>Address and postcode</li>
            <li>Account activity and usage data</li>
            <li>IP address and device data</li>
          </ul>
        </div>

        {/* DATA USAGE */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">How We Use Data</h2>
          </div>

          <p className="text-sm text-gray-600">
            We use your data to process orders, improve services, and provide support.
          </p>
        </div>

        {/* SECURITY */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Data Security</h2>
          </div>

          <p className="text-sm text-gray-600">
            Your data is stored securely and protected against unauthorised access.
          </p>
        </div>

        {/* RIGHTS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Your Rights</h2>
          </div>

          <p className="text-sm text-gray-600">
            You can request access, correction, or deletion of your personal data.
          </p>
        </div>

        {/* CONTACT */}
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
          <Mail className="mx-auto text-[#445D41] mb-3" />
          <h3 className="font-semibold">Contact Us</h3>
          <p className="text-sm text-gray-600">
            customersupport@direct-care.co.uk <br />
            +44 121 661 6357 / +44 121 461 6835
          </p>
        </div>

      </div>
    </div>
  );
}