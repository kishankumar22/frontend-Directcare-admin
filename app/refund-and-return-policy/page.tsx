"use client";

import { RefreshCw, AlertCircle, PackageCheck, Phone, Mail } from "lucide-react";

export default function RefundPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO */}
      <div className="bg-[#445D41] text-white py-16 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold">
          Refund & Return Policy
        </h1>
        <p className="mt-3 text-sm md:text-lg opacity-90 max-w-2xl mx-auto">
          Easy returns, transparent process, and customer-first support.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* 📌 OVERVIEW */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Overview</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We always strive for your highest satisfaction. If you are not fully
            satisfied with your purchase, you can return items within{" "}
            <strong>30 working days</strong> in unused condition.
          </p>
        </div>

        {/* 📦 RETURN CONDITIONS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PackageCheck className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Return Conditions</h2>
          </div>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>Item must be unused and undamaged</li>
            <li>Original packaging with labels must be intact</li>
            <li>No signs of wear, washing, or usage</li>
          </ul>

          <p className="text-sm text-gray-600 mt-3">
            Refunds will not be processed if items do not meet these conditions.
          </p>
        </div>

        {/* ⚠️ NON-RETURNABLE */}
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-red-600" />
            <h2 className="text-lg font-semibold text-red-700">
              Non-Returnable Items
            </h2>
          </div>

          <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
            <li>Perishable items</li>
            <li>Baby milk products</li>
            <li>Mixed goods that cannot be separated</li>
            <li>Custom-made or personalised items</li>
            <li>Items with broken hygiene seals</li>
          </ul>

          <p className="text-xs text-red-600 mt-3">
            This does not affect your statutory rights.
          </p>
        </div>

        {/* 🔄 REFUND PROCESS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Refund Process</h2>
          </div>

          <p className="text-sm text-gray-600">
            Once your returned item reaches our warehouse and passes inspection,
            your refund will be processed automatically.
          </p>

          <p className="text-sm text-gray-600 mt-2">
            Refunds usually take <strong>3–4 working days</strong>, depending on your bank.
          </p>
        </div>

        {/* 📞 RETURN PROCESS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            How to Return Your Item
          </h2>

          <p className="text-sm text-gray-600 mb-3">
            Contact our support team with the following details:
          </p>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Full Name</li>
            <li>Order Date & Order Number</li>
            <li>Date of Delivery</li>
            <li>Address with postcode</li>
            <li>Phone number</li>
            <li>Reason for return</li>
          </ul>

          <p className="text-sm text-gray-600 mt-3">
            Once approved, a return label will be sent to you.
          </p>
        </div>

        {/* 🏢 WAREHOUSE ADDRESS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            Return Address
          </h2>

          <p className="text-sm text-gray-600">
            Direct Care Warehouse <br />
            Spacebox Business Park Unit 38A <br />
            Plume Street, B6 7RT <br />
            Birmingham, United Kingdom
          </p>
        </div>

        {/* 🔁 EXCHANGE */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-green-700 mb-2">
            Exchange Option Available
          </h2>

          <p className="text-sm text-green-700">
            We offer product exchanges. Your unwanted item will be collected when
            the replacement is delivered — with no additional delivery charges.
          </p>
        </div>

        {/* 📞 CONTACT */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            Need Help?
          </h2>

          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Phone size={16} /> +44 121 661 6357 / +44 121 461 6835
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} /> customersupport@direct-care.co.uk
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}