"use client";

import { Store, Clock, CheckCircle, MapPin } from "lucide-react";

export default function ClickAndCollectPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Click & Collect
          </h1>
          <p className="text-sm md:text-lg max-w-2xl opacity-90">
            Order online and collect your items at a time that suits you.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Store className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Store Pickup</h3>
          <p className="text-sm text-gray-600">
            Collect your order from a nearby store or pickup location.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Clock className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Quick Ready Time</h3>
          <p className="text-sm text-gray-600">
            Orders are usually ready within 24–48 hours.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <CheckCircle className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Free Collection</h3>
          <p className="text-sm text-gray-600">
            Enjoy free collection on eligible orders.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <MapPin className="text-[#445D41] mb-3" />
          <h3 className="font-semibold mb-2">Flexible Timing</h3>
          <p className="text-sm text-gray-600">
            Pick up your order at your convenience.
          </p>
        </div>

      </div>
    </div>
  );
}