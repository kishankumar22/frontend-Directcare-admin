"use client";

import { Building2, ShieldCheck, Users, Mail } from "lucide-react";

export default function CompanyInfoPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO */}
      <div className="bg-[#445D41] text-white py-3 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold">
          About Direct Care
        </h1>
        <p className="mt-3 text-sm md:text-lg opacity-90 max-w-2xl mx-auto">
          Your trusted destination for health, beauty, and everyday essentials.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* 🏢 ABOUT */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Our Company</h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            At Direct Care, we are dedicated to transforming the online shopping experience 
            for customers across the UK by offering high-quality personal care and health products 
            at affordable prices.
          </p>

          <p className="text-sm text-gray-600 leading-relaxed">
            Established in 2012, our mission is to provide a smooth and reliable shopping experience, 
            catering to diverse needs including baby care, skincare, beauty products, and health essentials.
          </p>
        </div>

        {/* 🛍️ WHAT WE OFFER */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            What We Offer
          </h2>

          <p className="text-sm text-gray-600 mb-3">
            Direct Care is your go-to platform for:
          </p>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Beauty & cosmetic products</li>
            <li>Skincare essentials</li>
            <li>Baby & child care items</li>
            <li>Stop-smoking aids</li>
            <li>Incontinence products</li>
            <li>Vitamin & supplement range</li>
          </ul>

          <p className="text-sm text-gray-600 mt-3">
            We ensure fast delivery and provide products from trusted brands you love.
          </p>
        </div>

        {/* 🛡️ INFORMATION */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Business Information</h2>
          </div>

          <ul className="text-sm text-gray-600 space-y-2">
            <li><strong>Owner:</strong> Brijesh Kumar</li>
            <li><strong>Superintendent Pharmacist:</strong> Surabhi Kumar (2057840)</li>
            <li><strong>Address:</strong> Unit 38A, Plume Street, Aston, Birmingham</li>
            <li><strong>GPhC Registration:</strong> Awaiting</li>
          </ul>

          <p className="text-sm text-gray-600 mt-3">
            For complaints or feedback, email us at{" "}
            <span className="font-medium">Suby@direct-care.co.uk</span>
          </p>
        </div>

        {/* ⚖️ COMPLAINT POLICY */}
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">
            Complaints & Escalation
          </h2>

          <p className="text-sm text-yellow-800 leading-relaxed">
            If you have any concerns, please contact us directly first via email or phone. 
            If the issue is not resolved, you may escalate it to your local ombudsman or 
            Integrated Care Board (ICB).
          </p>

          <p className="text-sm text-yellow-800 mt-2">
            Complaints should be made within 12 months. You will receive an acknowledgement 
            within 3 working days and a full response within the required timeframe.
          </p>
        </div>

        {/* 🌍 HERITAGE */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Users className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Our Heritage</h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Direct Care was founded with a vision to transform how UK consumers 
            access essential products. We continuously innovate to enhance our 
            services while maintaining a strong commitment to customer satisfaction.
          </p>
        </div>

        {/* 🚀 COMMITMENT */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-green-700 mb-3">
            Our Commitment
          </h2>

          <p className="text-sm text-green-700 leading-relaxed">
            We are committed to making online shopping convenient, reliable, and 
            sustainable. Our goal is to provide affordable, high-quality products 
            while delivering an exceptional customer experience every time.
          </p>
        </div>

        {/* 📩 CONTACT CTA */}
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
          <Mail className="mx-auto text-[#445D41] mb-3" size={26} />
          <h3 className="font-semibold mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-gray-600">
            Reach out to our support team anytime at{" "}
            <span className="font-medium">
              customersupport@direct-care.co.uk
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}