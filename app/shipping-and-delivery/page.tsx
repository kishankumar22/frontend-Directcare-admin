"use client";

import { Truck, Clock, Package, MapPin } from "lucide-react";

export default function ShippingPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO */}
      <div className="bg-[#445D41] text-white py-3 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold">
          Shipping & Delivery
        </h1>
        <p className="mt-3 text-sm md:text-lg opacity-90 max-w-2xl mx-auto">
          Fast, reliable and transparent delivery service across the UK.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* 📦 INTRO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            Direct Care recognises that when you purchase a product online, you expect it to be delivered quickly.
            Below you’ll find all the details about our shipping and delivery process.
          </p>
        </div>

        {/* 🚚 SHIPPING DETAILS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">
              Shipping & Tracking Details
            </h2>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Orders above <strong>£35 qualify for free delivery</strong>.
          </p>

          <p className="text-sm text-gray-600 mb-3">
            Once your order is dispatched, you will receive an email containing:
          </p>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Parcel Number</li>
            <li>Item/Product details</li>
            <li>Tracking number</li>
          </ul>
        </div>

        {/* 💰 DELIVERY OPTIONS */}
        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <Truck className="text-[#445D41] mb-3" />
            <h3 className="font-semibold mb-2">Standard Delivery</h3>
            <p className="text-sm text-gray-600">£2.99</p>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <Clock className="text-[#445D41] mb-3" />
            <h3 className="font-semibold mb-2">Next Day Delivery</h3>
            <p className="text-sm text-gray-600">
              £3.75 (Order before 1 PM)
            </p>
          </div>

        </div>

        {/* ⏱ DELIVERY INFO */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            Delivery Information
          </h2>

          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
            <li>Deliveries usually occur between 10 AM – 5 PM</li>
            <li>Timings are calculated from order placement</li>
            <li>Weekends & bank holidays are excluded</li>
            <li>Signature may be required on delivery</li>
          </ul>
        </div>

        {/* ⚡ NEXT DAY DETAILS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            Next Day Delivery
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed">
            Orders placed before <strong>1 PM (Mon–Fri)</strong> are dispatched the same day
            and delivered the next working day.
          </p>

          <p className="text-sm text-gray-600 mt-2">
            Orders placed after 1 PM on Friday or during weekends will be delivered the next working day.
          </p>
        </div>

        {/* 🌍 DELIVERY AREAS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">
              Delivery Destinations
            </h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            We deliver across the UK mainland, Northern Ireland, Isle of Man,
            Isle of Wight, and Scottish Highlands.
          </p>

          <p className="text-sm text-gray-600 mt-2">
            Delivery is available Monday to Friday (excluding bank holidays).
          </p>
        </div>

        {/* ⚠️ RESTRICTIONS */}
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-red-700 mb-3">
            Delivery Restrictions
          </h2>

          <p className="text-sm text-red-700 mb-3">
            Some postcodes are not eligible for next-day delivery.
          </p>

          <div className="text-xs text-red-600 max-h-40 overflow-y-auto leading-relaxed">
            AB37, AB38, AB55, AB56, FK20, GY1, IV2, GY2, IV4, IV5, IV6, IV7,
            IV8, IV9, IV10, IV12, IV15, IV17, IV19, IV21, IV23, IV25, JE1,
            IV27, JE2, IV30, JE3, IV32, AB54, IV40, PH16, IV42, BF1...
            <br /><br />
            (Full postcode list added — scrollable for better UX)
          </div>
        </div>

      </div>
    </div>
  );
}