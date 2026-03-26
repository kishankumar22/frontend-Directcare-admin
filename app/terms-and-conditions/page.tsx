"use client";

import { FileText, ShieldCheck, CreditCard, Globe, Mail } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-3 text-center px-4">
        <h1 className="text-3xl md:text-5xl font-bold">
          Terms & Conditions
        </h1>
        <p className="mt-3 opacity-90 max-w-2xl mx-auto">
          Please read these terms carefully before using our website.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* INTRO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            These terms govern the use of our website and all orders placed through it.
            We aim to keep everything clear and understandable for you.
          </p>
        </div>

        {/* COMPANY INFO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Company Information</h2>
          </div>

          <p className="text-sm text-gray-600">
            Direct Care Ltd (Company Number: 06874500)
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Unit 38A, Plume Street <br />
            Spacebox Business Park <br />
            B6 7RT Birmingham
          </p>
        </div>

        {/* TERMS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">
            Usage & Responsibilities
          </h2>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>You must be at least 18 years old to use this site</li>
            <li>You are responsible for your account and login details</li>
            <li>All disputes are governed by English law</li>
            <li>We are not liable for indirect losses</li>
          </ul>
        </div>

        {/* ORDERS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Orders & Payments</h2>
          </div>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>We may accept or reject orders at our discretion</li>
            <li>Order confirmation does not form a contract until invoiced</li>
            <li>Payment is processed upon dispatch (except PayPal)</li>
            <li>All orders depend on stock availability</li>
          </ul>
        </div>

        {/* MARKETING */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            Promotions & Discounts
          </h2>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>One voucher code per order</li>
            <li>Some items may be excluded from discounts</li>
            <li>Multi-buy discounts apply to cheapest item</li>
          </ul>
        </div>

        {/* PRIVACY */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Privacy & Data</h2>
          </div>

          <p className="text-sm text-gray-600">
            We process your personal information according to our Privacy Policy.
          </p>
        </div>

        {/* INTELLECTUAL */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            Intellectual Property
          </h2>

          <p className="text-sm text-gray-600">
            All website content including text, graphics, and design is owned by us.
            Personal use is allowed, but commercial use is prohibited.
          </p>
        </div>

        {/* CONTACT */}
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
          <Mail className="mx-auto text-[#445D41] mb-3" />
          <h3 className="font-semibold">Need Help?</h3>
          <p className="text-sm text-gray-600">
            customersupport@direct-care.co.uk <br />
            +44 121 661 6357 / +44 121 461 6835
          </p>
        </div>

      </div>
    </div>
  );
}