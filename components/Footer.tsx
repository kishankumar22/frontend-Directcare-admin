'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useNewsletter } from "@/app/hooks/useNewsletter";
export default function Footer() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    help: false,
    about: false,
    services: false,
    subscribe: true,
    social: true,
  });

  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));
  const [localError, setLocalError] = useState<string | null>(null);
const { submitEmail, error, success } = useNewsletter();

const [email, setEmail] = useState("");
const [loading, setLoading] = useState(false);

const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();

  setLocalError(null);

  if (!email.trim()) {
    setLocalError("Please enter your email address.");
    return;
  }

  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email.trim())) {
    setLocalError("Please enter a valid email address.");
    return;
  }

  setLoading(true);

  await submitEmail(email.trim());

  setLoading(false);
  setEmail("");
};
  return (
    <footer className="bg-[#445D41] w-full text-white">
      {/* Top Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:gap-[0.5rem] divide-y divide-white/20 md:divide-y-0">
          {/* Help & Support */}
          <div className="py-3 md:py-0">
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("help")}>
              <h4 className="text-base md:text-lg font-semibold">Help & Support</h4>
              <ChevronDown className={`${open.help ? "rotate-180" : "rotate-0"} md:hidden transition-transform`} />
            </button>
            <ul className={`text-sm opacity-90 mt-2 space-y-2 ${open.help ? "block" : "hidden md:block"}`}>
            <li>
  <Link href="/account?tab=tracking">
    Order Tracking
  </Link>
</li>
              <li><Link href="#">Contact Us</Link></li>
              <li><Link href="#">Shipping And Delivery</Link></li>
              <li><Link href="#">Refund And Return Policy</Link></li>
              <li><Link href="#">FAQ 24/7</Link></li>
            </ul>
          </div>

          {/* About Us */}
          <div className="py-3 md:py-0">
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("about")}>
              <h4 className="text-base md:text-lg font-semibold">About Us</h4>
              <ChevronDown className={`${open.about ? "rotate-180" : "rotate-0"} md:hidden transition-transform`} />
            </button>
            <ul className={`text-sm opacity-90 mt-2 space-y-2 ${open.about ? "block" : "hidden md:block"}`}>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="#">Company Info</Link></li>
              <li><Link href="#">Careers</Link></li>
              <li><Link href="#">Terms & Conditions</Link></li>
              <li><Link href="#">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Our Services */}
          <div className="py-3 md:py-0">
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("services")}>
              <h4 className="text-base md:text-lg font-semibold">Our Services</h4>
              <ChevronDown className={`${open.services ? "rotate-180" : "rotate-0"} md:hidden transition-transform`} />
            </button>
            <ul className={`text-sm opacity-90 mt-2 space-y-2 ${open.services ? "block" : "hidden md:block"}`}>
              <li><Link href="/offers">Offers</Link></li>
              <li><Link href="/brands">Shop By Brand</Link></li>
              <li><Link href="/category">Shop By Category</Link></li>
              <li><Link href="#">Popular Products</Link></li>
            </ul>
          </div>

          {/* Subscribe */}
          <div className="py-3 md:py-0">
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("subscribe")}>
              <h4 className="text-base md:text-lg font-semibold">Subscribe Us</h4>
              <ChevronDown className={`${open.subscribe ? "rotate-180" : "rotate-0"} md:hidden transition-transform`} />
            </button>
            <div className={`text-sm opacity-90 mt-2 ${open.subscribe ? "block" : "hidden md:block"}`}>
              <p className="mb-3 text-sm">Enter your email to receive our latest updates about our products.</p>
             <form
  onSubmit={handleSubscribe}
  className="flex flex-col sm:flex-row gap-2"
>
  <input
    type="email"
    placeholder="Email address"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="flex-1 p-2 rounded text-sm text-black min-w-0"
  />

  <button
    type="submit"
    disabled={loading}
    className="bg-[#005625] text-white px-4 py-2 rounded text-sm whitespace-nowrap hover:bg-black transition disabled:opacity-60"
  >
    {loading ? "Submitting..." : "Subscribe"}
  </button>
</form>
{localError && (
  <p className="text-xs text-red-300 mt-2">
    {localError}
  </p>
)}

{error && (
  <p className="text-xs text-red-300 mt-2">
    {error}
  </p>
)}

{success && (
  <p className="text-xs text-green-300 mt-2">
    {success}
  </p>
)}
            </div>
          </div>

          {/* Social */}
          <div className="py-3 md:py-0">
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("social")}>
              <h4 className="text-base md:text-lg font-semibold">Social</h4>
              <ChevronDown className={`${open.social ? "rotate-180" : "rotate-0"} md:hidden transition-transform`} />
            </button>
            <div className={`mt-2 ${open.social ? "block" : "hidden md:block"}`}>
              <div className="flex gap-2 flex-wrap mt-2">
                <Link href="#" className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition"><Image src="/social/facebook.svg" alt="Facebook" width={22} height={22} /></Link>
                <Link href="#" className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition"><Image src="/social/instagram.svg" alt="Instagram" width={22} height={22} /></Link>
                <Link href="#" className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition"><Image src="/social/linkedin.svg" alt="LinkedIn" width={22} height={22} /></Link>
                <Link href="#" className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition"><Image src="/social/twitter.svg" alt="Twitter" width={22} height={22} /></Link>
                <Link href="#" className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition"><Image src="/social/youtube.svg" alt="YouTube" width={22} height={22} /></Link>
                <Link href="#" className="w-8 h-8 flex items-center justify-center bg-white rounded-full hover:scale-110 transition"><Image src="/social/tiktok.svg" alt="TikTok" width={22} height={22} /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Strip */}
      <div className="bg-black text-white opacity-90 text-sm flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-3 gap-2 md:gap-0">
        <p className="text-xs md:text-sm text-center md:text-left">© 2024 Direct Care All Rights Reserved</p>
        <div>
          <Image src="/payments/visa.png" alt="visa" width={130} height={35} className="md:w-[160px]" />
        </div>
        <p className="text-xs md:text-sm">Developed By Mezzex</p>
      </div>
    </footer>
  );
}
