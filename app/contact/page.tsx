"use client";

import { Mail, Phone, MapPin, User, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO */}
      <div className="bg-[#445D41] text-white py-16 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold">
          Contact Us
        </h1>
        <p className="mt-3 text-sm md:text-lg opacity-90 max-w-2xl mx-auto">
          Our Customer Service team is always ready to assist you. Reach out using any of the options below.
        </p>
      </div>

      {/* 🔥 MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* 📌 CONTACT OPTIONS */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* EMAIL */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <Mail className="text-[#445D41] mb-3" size={26} />
            <h3 className="font-semibold mb-2">Email Us</h3>
            <p className="text-sm text-gray-600 mb-2">
              customersupport@direct-care.co.uk
            </p>
            <p className="text-xs text-gray-500">
              We aim to respond within 24 hours.
            </p>
          </div>

          {/* PHONE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <Phone className="text-[#445D41] mb-3" size={26} />
            <h3 className="font-semibold mb-2">Call Us</h3>
            <p className="text-sm text-gray-600">
              +44 121 661 6357 <br />
              +44 121 461 6835
            </p>
          </div>

          {/* ADDRESS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
            <MapPin className="text-[#445D41] mb-3" size={26} />
            <h3 className="font-semibold mb-2">Visit Us</h3>
            <p className="text-sm text-gray-600">
              Unit 38A, Plume Street, Aston, Birmingham
            </p>
          </div>

        </div>

        {/* 🕒 WORKING HOURS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="text-[#445D41]" />
            <h3 className="text-lg font-semibold">Working Hours</h3>
          </div>

          <p className="text-sm text-gray-600">
            Mon – Sat: 9:00 AM – 6:00 PM
          </p>
          <p className="text-sm text-gray-600">
            Bank Holidays: Closed
          </p>
        </div>

        {/* 👤 BUSINESS INFO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-[#445D41]" />
            <h3 className="text-lg font-semibold">Business Information</h3>
          </div>

          <ul className="text-sm text-gray-600 space-y-2">
            <li><strong>Owner:</strong> Brijesh Kumar</li>
            <li><strong>Superintendent Pharmacist:</strong> Surabhi Kumar (2057840)</li>
            <li><strong>GPhC Registration:</strong> Awaiting</li>
          </ul>
        </div>

        {/* 📩 SUPPORT & FEEDBACK */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-semibold mb-3">
            Assistance & Guidance
          </h3>

          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            At Direct Care, we are dedicated to delivering quality service. Your feedback is highly valued and helps us improve.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            If you have any complaints, concerns, or feedback, feel free to contact us using any of the methods above.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            We are committed to resolving all issues quickly and effectively.
          </p>
        </div>

        {/* ⚠️ COMPLAINT EMAIL */}
        <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl">
          <p className="text-sm text-yellow-800">
            For complaints or urgent concerns, email us at:{" "}
            <span className="font-semibold">
              Suby@direct-care.co.uk
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}