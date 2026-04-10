"use client";

import { useState } from "react";
import {
  Mail, Phone, MapPin, Clock, User, Building2,
  Send, CheckCircle, AlertCircle, ChevronRight,
  Package, RotateCcw, Truck, Pill, HelpCircle, MessageSquare
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "Order Issue",       label: "Order Issue",       icon: Package },
  { value: "Delivery",          label: "Delivery & Shipping", icon: Truck },
  { value: "Returns/Refunds",   label: "Returns & Refunds", icon: RotateCcw },
  { value: "Pharmacy",          label: "Pharmacy Advice",   icon: Pill },
  { value: "Product Query",     label: "Product Query",     icon: HelpCircle },
  { value: "General",           label: "General Enquiry",   icon: MessageSquare },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ContactPage() {
 const [form, setForm] = useState({
  name: "",
  email: "",
  phone: "+44",
  orderNumber: "",
  category: "General",
  subject: "",
  message: "",
});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
const validateForm = () => {
  if (!form.name.trim()) return "Name is required";
  if (!form.email.trim()) return "Email is required";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email)) return "Invalid email";

  if (!form.subject.trim()) return "Subject is required";

  if (form.message.trim().length < 10)
    return "Message must be at least 10 characters";

  // phone validation (optional but pro)
  if (form.phone.length < 6)
    return "Enter valid phone number";

  return null;
};
 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const validationError = validateForm();
  if (validationError) {
    setError(validationError);
    return;
  }

  setError("");
  setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/Contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        setSuccess(true);
      } else {
        setError(json.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not send your message. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-gradient-to-r from-[#445D41] via-[#3a5237] to-[#2d4029] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-4">
          <nav className="flex items-center gap-1.5 text-sm text-white/60 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">Contact Us</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Get in Touch</h1>
          <p className="mt-2 text-white/75 text-base max-w-lg">
            Have a question about your order, a product or our pharmacy services?
            Our team is here to help — Mon to Sat, 9am–6pm.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT — Contact Info + Map */}
        <div className="space-y-5">

          {/* Info cards */}
          {[
            {
              icon: Phone,
              title: "Call Us",
              lines: ["+44 121 661 6357", "+44 121 461 6835"],
              sub: "Mon–Sat 9:00 AM – 6:00 PM",
            },
            {
              icon: Mail,
              title: "Email Us",
              lines: ["customersupport@direct-care.co.uk"],
              sub: "We aim to reply within 24 hours",
            },
            {
              icon: MapPin,
              title: "Visit Us",
              lines: ["Unit 38A, Plume Street", "Aston, Birmingham, B6 7RN"],
              sub: "Open Mon–Sat",
            },
          ].map(({ icon: Icon, title, lines, sub }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-[#445D41]/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-[#445D41]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
                {lines.map(l => <p key={l} className="text-sm text-gray-700">{l}</p>)}
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            </div>
          ))}

          {/* Working Hours */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-[#445D41]" />
              <p className="font-semibold text-gray-900 text-sm">Working Hours</p>
            </div>
            <div className="space-y-1.5 text-sm">
              {[
                ["Monday – Friday", "9:00 AM – 6:00 PM"],
                ["Saturday",        "9:00 AM – 4:00 PM"],
                ["Sunday",          "Closed"],
                ["Bank Holidays",   "Closed"],
              ].map(([day, hrs]) => (
                <div key={day} className="flex justify-between">
                  <span className="text-gray-500">{day}</span>
                  <span className={`font-medium ${hrs === "Closed" ? "text-red-500" : "text-gray-900"}`}>{hrs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-[#445D41]" />
              <p className="font-semibold text-gray-900 text-sm">Business Information</p>
            </div>
            <div className="space-y-1.5 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">Owner:</span> Brijesh Kumar</p>
              <p><span className="font-medium text-gray-800">Pharmacist:</span> Surabhi Kumari (2057840)</p>
              <p><span className="font-medium text-gray-800">Complaints:</span>{" "}
                <a href="mailto:Suby@direct-care.co.uk" className="text-[#445D41] hover:underline">Suby@direct-care.co.uk</a>
              </p>
            </div>
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
              <MapPin className="h-4 w-4 text-[#445D41]" />
              <span className="text-sm font-medium text-gray-700">Unit 38A, Plume Street, Aston, Birmingham</span>
            </div>
            <iframe
              title="Direct Care Warehouse Location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-1.9012%2C52.4884%2C-1.8612%2C52.5084&layer=mapnik&marker=52.4984%2C-1.8812"
              width="100%"
              height="220"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              allowFullScreen
            />
            <a
              href="https://www.openstreetmap.org/?mlat=52.4984&mlon=-1.8812#map=15/52.4984/-1.8812"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-50 text-center text-xs text-[#445D41] py-2 hover:bg-gray-100 transition-colors"
            >
              View larger map →
            </a>
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">

            {success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                  Thank you for contacting us. We've sent a confirmation to your email and will respond within 24 hours.
                </p>
                <button
                  onClick={() => { setSuccess(false); setForm({ name:"",email:"",phone:"",orderNumber:"",category:"General",subject:"",message:"" }); }}
                  className="px-6 py-2.5 bg-[#445D41] text-white rounded-xl font-semibold hover:bg-[#3a5237] transition-colors text-sm"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Send Us a Message</h2>
                  <p className="text-sm text-gray-500 mt-1">Fill in the form below and we'll get back to you as soon as possible.</p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Category selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">What can we help you with?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("category", value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          form.category === value
                            ? "bg-[#445D41] text-white border-[#445D41]"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#445D41] hover:text-[#445D41]"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                        placeholder="John Smith"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                        placeholder="john@example.com"
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Phone + Order Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                     <input
  type="tel"
  value={form.phone}
  maxLength={13}
  onChange={(e) => {
    let value = e.target.value;

    // ensure +44 always present
    if (!value.startsWith("+44")) {
      value = "+44";
    }

    // allow only numbers after +44
    const cleaned = "+44" + value.replace(/^\+44/, "").replace(/\D/g, "");

    set("phone", cleaned);
  }}
  onKeyDown={(e) => {
    // prevent deleting +44
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      form.phone.length <= 3
    ) {
      e.preventDefault();
    }
  }}
  placeholder="+44 7123 456789"
  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none transition"
/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Order Number
                        <span className="text-xs text-gray-400 font-normal ml-1">(if applicable)</span>
                      </label>
                      <input
                        type="text"
                        value={form.orderNumber}
                        onChange={e => set("orderNumber", e.target.value)}
                        placeholder="e.g. DC-2024-00123"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={e => set("subject", e.target.value)}
                      placeholder="Brief description of your enquiry"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none transition"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => set("message", e.target.value)}
                      placeholder="Please describe your issue or question in detail..."
                      required
                      rows={5}
                      minLength={10}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none transition resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length} characters</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#445D41] hover:bg-[#3a5237] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    By submitting this form you agree to our{" "}
                    <Link href="/privacy-policy" className="underline hover:text-[#445D41]">Privacy Policy</Link>.
                    We will never share your data.
                  </p>
                </form>
              </>
            )}
          </div>

          {/* FAQ prompt */}
          <div className="mt-5 bg-[#445D41]/5 border border-[#445D41]/20 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Looking for quick answers?</p>
              <p className="text-xs text-gray-500 mt-0.5">Check our FAQ for instant help with common questions.</p>
            </div>
            <Link
              href="/faq"
              className="shrink-0 px-4 py-2 bg-[#445D41] text-white text-sm font-semibold rounded-xl hover:bg-[#3a5237] transition-colors"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
