"use client";

import { ShieldCheck, Clock, Truck, Star } from "lucide-react";

export default function SpecialDeliveryPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Special Delivery Guaranteed
          </h1>
          <p className="text-sm md:text-lg max-w-2xl opacity-90">
            Premium delivery service with guaranteed timing and priority handling.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Clock className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Guaranteed Timing</h3>
          <p className="text-sm text-gray-600">
            Delivered before 1 PM on the next working day.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Truck className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Priority Handling</h3>
          <p className="text-sm text-gray-600">
            Your order is processed and shipped with top priority.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <ShieldCheck className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Secure Delivery</h3>
          <p className="text-sm text-gray-600">
            Enhanced security and proof of delivery included.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Star className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Premium Service</h3>
          <p className="text-sm text-gray-600">
            Ideal for urgent and high-value orders.
          </p>
        </div>

      </div>
    </div>
  );
}