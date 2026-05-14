"use client";

import { Truck, Clock, ShieldCheck, MapPin } from "lucide-react";

export default function NextDayDeliveryPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO SECTION */}
      <div className="bg-[#445D41] text-white py-2 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm uppercase tracking-wider opacity-80 mb-2">
            Delivery Service
          </p>

          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Next Day Delivery
          </h1>

          <p className="text-sm md:text-lg max-w-2xl opacity-90">
            Need it fast? Our next day delivery ensures your order reaches you
            as quickly as possible with reliable and secure shipping.
          </p>
        </div>
      </div>

      {/* 🔥 FEATURES GRID */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">

          {/* CARD 1 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3 text-[#445D41]">
              <Clock size={22} />
              <h3 className="text-lg font-semibold">Fast Delivery</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Orders placed before the daily cutoff time are delivered on the
              very next working day.
            </p>
          </div>

          {/* CARD 2 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3 text-[#445D41]">
              <Truck size={22} />
              <h3 className="text-lg font-semibold">Reliable Shipping</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              We partner with trusted delivery services to ensure your order
              arrives safely and on time.
            </p>
          </div>

          {/* CARD 3 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3 text-[#445D41]">
              <MapPin size={22} />
              <h3 className="text-lg font-semibold">Wide Coverage</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Available across most locations, ensuring fast delivery wherever
              you are.
            </p>
          </div>

          {/* CARD 4 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3 text-[#445D41]">
              <ShieldCheck size={22} />
              <h3 className="text-lg font-semibold">Secure Handling</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your products are carefully packed and handled with utmost care
              during transit.
            </p>
          </div>

        </div>
      </div>

      {/* 🔥 EXTRA INFO SECTION */}
      <div className="max-w-4xl mx-auto px-4 pb-14">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Important Information
          </h2>

          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>Orders must be placed before the cutoff time for next day delivery.</li>
            <li>Delivery timelines may vary during holidays or peak seasons.</li>
            <li>Some remote locations may not be eligible for next day delivery.</li>
            <li>You will receive tracking details once your order is dispatched.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}