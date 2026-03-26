"use client";

import { Truck, Clock, MapPin, Package } from "lucide-react";

export default function StandardDeliveryPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-2 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Standard Delivery
          </h1>
          <p className="text-sm md:text-lg max-w-2xl opacity-90">
            Affordable and reliable delivery option for everyday orders.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Clock className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Delivery Time</h3>
          <p className="text-sm text-gray-600">
            Orders are typically delivered within 3–5 working days.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Truck className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Reliable Service</h3>
          <p className="text-sm text-gray-600">
            Trusted delivery partners ensure safe and timely delivery.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Package className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Free Shipping</h3>
          <p className="text-sm text-gray-600">
            Free delivery available on orders above a certain value.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <MapPin className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Wide Coverage</h3>
          <p className="text-sm text-gray-600">
            Available across all serviceable locations.
          </p>
        </div>

      </div>
    </div>
  );
}