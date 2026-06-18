'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
// import { useNewsletter } from "@/app/hooks/useNewsletter"; // Uncomment when hook is ready

export default function Footer() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    help: false,
    about: false,
    services: false,
    information: false,
    subscribeSocial: true,
  });

  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));
  const [localError, setLocalError] = useState<string | null>(null);
  // const { submitEmail, error, success } = useNewsletter(); // Replace with actual hook

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    // await submitEmail(email.trim()); // Replace with actual submission
    console.log("Subscribing email:", email);
    setLoading(false);
    setEmail("");
    // Show success message manually for demo
  };

  // Placeholder for newsletter hook state
  const error = null;
  const success = null;

  return (
    <footer className="bg-[#445D41] w-full text-white overflow-x-hidden">
      {/* Top Content */}
      <div className="w-full px-3 py-4 md:px-6 md:py-10">
        <div className="max-w-7xl mx-auto">
          {/* Responsive grid - Online Pharmacy Info gets larger width on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-0 md:gap-6">
            
            {/* Help & Support - 2 cols on lg */}
            <div className="lg:col-span-2 border-b border-white/20 md:border-b-0 pb-4 mb-2 md:pb-0 md:mb-0">
              <button
                className="w-full flex items-center justify-between md:justify-start group py-2 md:py-0"
                onClick={() => toggle("help")}
              >
                <h4 className="text-base md:text-lg font-semibold tracking-wide">Help & Support</h4>
                <ChevronDown
                  className={`md:hidden transition-transform duration-200 ${
                    open.help ? "rotate-180" : "rotate-0"
                  }`}
                  size={18}
                />
              </button>
              <ul
                className={`text-sm text-white/85 mt-3 space-y-2 ${
                  open.help ? "block" : "hidden md:block"
                }`}
              >
                <li>
                  <Link href="/account?tab=tracking" className="hover:text-white hover:underline transition block py-0.5">
                    Order Tracking
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white hover:underline transition block py-0.5">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/shipping-and-delivery" className="hover:text-white hover:underline transition block py-0.5">
                    Shipping & Delivery
                  </Link>
                </li>
                <li>
                  <Link href="/refund-and-return-policy" className="hover:text-white hover:underline transition block py-0.5">
                    Refund & Return Policy
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white hover:underline transition block py-0.5">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/Legal/GDPR" className="hover:text-white hover:underline transition block py-0.5">
                   GDPR
                  </Link>
                </li>
              </ul>
            </div>

            {/* About Us - 2 cols on lg */}
            <div className="lg:col-span-2 border-b border-white/20 md:border-b-0 pb-4 mb-2 md:pb-0 md:mb-0">
              <button
                className="w-full flex items-center justify-between md:justify-start group py-2 md:py-0"
                onClick={() => toggle("about")}
              >
                <h4 className="text-base md:text-lg font-semibold tracking-wide">About Us</h4>
                <ChevronDown
                  className={`md:hidden transition-transform duration-200 ${
                    open.about ? "rotate-180" : "rotate-0"
                  }`}
                  size={18}
                />
              </button>
              <ul
                className={`text-sm text-white/85 mt-3 space-y-2 ${
                  open.about ? "block" : "hidden md:block"
                }`}
              >
                <li>
                  <Link href="/blog" className="hover:text-white hover:underline transition block py-0.5">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/company-info" className="hover:text-white hover:underline transition block py-0.5">
                    Company Info
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-white hover:underline transition block py-0.5">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/terms-and-conditions" className="hover:text-white hover:underline transition block py-0.5">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-white hover:underline transition block py-0.5">
                    Privacy Policy
                  </Link>
                </li>
                
              </ul>
            </div>

            {/* Our Services - 2 cols on lg */}
            <div className="lg:col-span-2 border-b border-white/20 md:border-b-0 pb-4 mb-2 md:pb-0 md:mb-0">
              <button
                className="w-full flex items-center justify-between md:justify-start group py-2 md:py-0"
                onClick={() => toggle("services")}
              >
                <h4 className="text-base md:text-lg font-semibold tracking-wide">Our Services</h4>
                <ChevronDown
                  className={`md:hidden transition-transform duration-200 ${
                    open.services ? "rotate-180" : "rotate-0"
                  }`}
                  size={18}
                />
              </button>
              <ul
                className={`text-sm text-white/85 mt-3 space-y-2 ${
                  open.services ? "block" : "hidden md:block"
                }`}
              >
                <li>
                  <Link href="/offers" className="hover:text-white hover:underline transition block py-0.5">
                    Offers
                  </Link>
                </li>
                <li>
                  <Link href="/brands" className="hover:text-white hover:underline transition block py-0.5">
                    Shop By Brand
                  </Link>
                </li>
                <li>
                  <Link href="/category" className="hover:text-white hover:underline transition block py-0.5">
                    Shop By Category
                  </Link>
                </li>
              </ul>

              {/* Pharmacy logo — always visible, outside collapse */}
              <div className="pt-3">
                <a href="https://www.pharmacyregulation.org/registers/pharmacy/registrationnumber/9013206" target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity w-fit">
                  <img src="/logo/Pharmacy%20Logo.jpg" alt="GPhC Registered Pharmacy" className="w-32 rounded-lg object-contain bg-white p-1" />
                </a>
              </div>
            </div>

            {/* Online Pharmacy Information - LARGER SECTION (4 cols on lg) */}
            <div className="lg:col-span-3 border-b border-white/20 md:border-b-0 pb-4 mb-2 md:pb-0 md:mb-0">
              <button
                className="w-full flex items-center justify-between md:justify-start group py-2 md:py-0"
                onClick={() => toggle("information")}
              >
                <h4 className="text-base md:text-lg font-semibold tracking-wide">Online Pharmacy Info</h4>
                <ChevronDown
                  className={`md:hidden transition-transform duration-200 ${
                    open.information ? "rotate-180" : "rotate-0"
                  }`}
                  size={18}
                />
              </button>
              <div
                className={`text-sm text-white/85 mt-3 space-y-3 ${
                  open.information ? "block" : "hidden md:block"
                }`}
              >
                <dl className="space-y-3" aria-label="Online Pharmacy Information">
                  <div className="hover:translate-x-1 transition-transform duration-150">
        
                    <dd className="text-white/85">Owner: Brijesh Kumar</dd>
                  </div>

                  <div className="hover:translate-x-1 transition-transform duration-150">
                    <dt className="font-medium text-white">Superintendent Pharmacist:</dt>
                    <dd className="text-white/85">Surabhi Kumari (2057840)</dd>
                  </div>

                  <div className="hover:translate-x-1 transition-transform duration-150">
                    <dt className="font-medium text-white">Pharmacy Address:</dt>
                    <dd className="text-white/85">Unit 38A, Plum Street, Aston, Birmingham</dd>
                  </div>

                  <div className="hover:translate-x-1 transition-transform duration-150">
                    
                    <dd className="text-white/85"> GPhC Reg No : 9013206</dd>
                  </div>

                  <div className="hover:translate-x-1 transition-transform duration-150">
                    <dt className="font-medium text-white">Complaints & Feedback:</dt>
                    <dd className="text-white/85">
                      <a
                        href="mailto:Suby@direct-care.co.uk"
                        className="hover:underline focus-visible:underline transition break-all"
                      >
                        Suby@direct-care.co.uk
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Subscribe & Connect - 3 cols on lg */}
            <div className="lg:col-span-3 border-b border-white/20 md:border-b-0 pb-4 mb-2 md:pb-0 md:mb-0">
              <button
                className="w-full flex items-center justify-between md:justify-start group py-2 md:py-0"
                onClick={() => toggle("subscribeSocial")}
              >
                <h4 className="text-base md:text-lg font-semibold tracking-wide">Subscribe & Connect</h4>
                <ChevronDown
                  className={`md:hidden transition-transform duration-200 ${
                    open.subscribeSocial ? "rotate-180" : "rotate-0"
                  }`}
                  size={18}
                />
              </button>
              <div
                className={`mt-3 ${open.subscribeSocial ? "block" : "hidden md:block"}`}
              >
                <p className="text-sm text-white/85 mb-3">
                  Enter your email to receive our latest updates about our products.
                </p>

               <form onSubmit={handleSubscribe} className="flex flex-col gap-2 w-full">
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="
                      flex-1
                      h-10
                      px-3
                      rounded-md
                      text-sm
                      text-black
                      bg-white
                      p-2
                      outline-none
                      focus:ring-2
                      focus:ring-[#005625]
                      placeholder:text-gray-500
                    "
                  />

                <button
  type="submit"
  disabled={loading}
  className="
    w-full
    h-10
    bg-[#005625]
    text-white
    px-5
    rounded-md
    text-sm
    font-medium
    hover:bg-black
    transition-all
    duration-200
    disabled:opacity-60
    cursor-pointer
  "
>
                    {loading ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>

                {localError && (
                  <p className="text-xs text-red-300 mt-2">{localError}</p>
                )}
                {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
                {success && (
                  <p className="text-xs text-green-300 mt-2">{success}</p>
                )}

                <div className="mt-5">
                  <h5 className="text-sm font-medium text-white mb-3">Follow Us</h5>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href="https://www.facebook.com/people/Direct-Care-Ltd/61558629399491/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200"
                      aria-label="Facebook"
                    >
                      <Image src="/social/facebook.svg" alt="Facebook" width={16} height={16} />
                    </a>
                    <a
                      href="https://www.instagram.com/directcare_ltd/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200"
                      aria-label="Instagram"
                    >
                      <Image src="/social/instagram.svg" alt="Instagram" width={16} height={16} />
                    </a>
                    <a
                      href="https://uk.pinterest.com/directcare_ltd/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200"
                      aria-label="Pinterest"
                    >
                      <Image src="/social/pinterest.svg" alt="Pinterest" width={16} height={16} />
                    </a>
                    <a
                      href="https://x.com/directcare_ltd"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200"
                      aria-label="X (Twitter)"
                    >
                      <Image src="/social/x.svg" alt="X" width={16} height={16} />
                    </a>
                    <a
                      href="https://youtube.com/@directcareltd?si=OrPTm-hf0BRKSCj8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200"
                      aria-label="YouTube"
                    >
                      <Image src="/social/youtube.svg" alt="YouTube" width={16} height={16} />
                    </a>
                    <a
                      href="https://www.tiktok.com/@directcare_ltd/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200"
                      aria-label="TikTok"
                    >
                      <Image src="/social/tiktok.svg" alt="TikTok" width={16} height={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Strip - Fixed overflow issue */}
    <div className="bg-black text-white opacity-90 text-sm flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-3 gap-2 md:gap-0">
        <p className="text-xs md:text-sm text-center md:text-left">© 2026 Direct Care All Rights Reserved</p>
        <div>
          <Image src="/payments/visa.png" alt="visa" width={120} height={35} className="md:w-[160px]" />
        </div>
        <p className="text-xs md:text-sm">
          Developed By{" "}
          <a
            href="https://www.mezzex.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-gray-300 transition"
          >
            Mezzex
          </a>
        </p>
      </div>
    </footer>
  );
}