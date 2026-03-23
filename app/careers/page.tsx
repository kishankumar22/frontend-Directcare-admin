"use client";

import { Briefcase, Users, Rocket, Heart, MapPin } from "lucide-react";

export default function CareersPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO */}
      <div className="bg-gradient-to-r from-[#445D41] to-[#2f4032] text-white py-20 px-4 text-center">
        <h1 className="text-3xl md:text-6xl font-bold">
          Join Our Team
        </h1>
        <p className="mt-4 text-sm md:text-lg max-w-2xl mx-auto opacity-90">
          Be part of a growing company transforming the way people shop for
          health and personal care products.
        </p>

        <button className="mt-6 px-6 py-3 bg-white text-[#445D41] font-semibold rounded-full hover:bg-gray-100 transition">
          View Open Positions
        </button>
      </div>

      {/* 🚀 WHY JOIN US */}
      <div className="max-w-6xl mx-auto px-4 py-16">

        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Why Work With Us?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-xl shadow-sm border text-center hover:shadow-md transition">
            <Rocket className="mx-auto text-[#445D41] mb-3" size={28} />
            <h3 className="font-semibold mb-2">Growth Opportunities</h3>
            <p className="text-sm text-gray-600">
              Grow your career in a fast-paced and innovative environment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border text-center hover:shadow-md transition">
            <Users className="mx-auto text-[#445D41] mb-3" size={28} />
            <h3 className="font-semibold mb-2">Great Team</h3>
            <p className="text-sm text-gray-600">
              Work with passionate and talented individuals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border text-center hover:shadow-md transition">
            <Heart className="mx-auto text-[#445D41] mb-3" size={28} />
            <h3 className="font-semibold mb-2">Positive Culture</h3>
            <p className="text-sm text-gray-600">
              A supportive and inclusive work environment.
            </p>
          </div>

        </div>
      </div>

      {/* 💼 OPEN ROLES */}
      <div className="bg-white py-16 px-4 border-t">
        <div className="max-w-5xl mx-auto">

          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Open Positions
          </h2>

          {/* JOB CARD */}
          <div className="space-y-4">

            {/* JOB 1 */}
            <div className="border rounded-xl p-5 hover:shadow-md transition flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">
                  Frontend Developer
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <MapPin size={14} /> Remote / UK
                </p>
              </div>

              <button className="px-4 py-2 bg-[#445D41] text-white rounded-md text-sm hover:bg-[#2f4032]">
                Apply Now
              </button>
            </div>

            {/* JOB 2 */}
            <div className="border rounded-xl p-5 hover:shadow-md transition flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">
                  Customer Support Executive
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <MapPin size={14} /> Birmingham
                </p>
              </div>

              <button className="px-4 py-2 bg-[#445D41] text-white rounded-md text-sm hover:bg-[#2f4032]">
                Apply Now
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* 📩 CTA */}
      <div className="bg-[#445D41] text-white py-16 text-center px-4">
        <h2 className="text-2xl md:text-3xl font-bold">
          Don’t see a role that fits?
        </h2>
        <p className="mt-3 text-sm md:text-lg opacity-90">
          Send us your resume and we’ll get in touch.
        </p>

        <button className="mt-6 px-6 py-3 bg-white text-[#445D41] font-semibold rounded-full hover:bg-gray-100 transition">
          careers@direct-care.co.uk
        </button>
      </div>

    </div>
  );
}