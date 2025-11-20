'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Footer() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    help: false,
    about: false,
    services: false,
    subscribe: true,
    social: false,
  });

  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  return (
    <footer className="bg-[#445D41] w-full text-white">
      {/* Top Content */}
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-[0.5rem]">
          {/* Help & Support */}
          <div>
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("help")}>
              <h4 className="text-lg font-semibold">Help & Support</h4>
              <ChevronDown className={`${open.help ? "rotate-180" : "rotate-0"} md:hidden`} />
            </button>
            <ul className={`text-sm opacity-90 mt-3 space-y-2 ${open.help ? "block" : "hidden md:block"}`}>
              <li><Link href="#">Order Tracking</Link></li>
              <li><Link href="#">Contact Us</Link></li>
              <li><Link href="#">Shipping And Delivery</Link></li>
              <li><Link href="#">Refund And Return Policy</Link></li>
              <li><Link href="#">FAQ 24/7</Link></li>
            </ul>
          </div>

          {/* About Us */}
          <div>
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("about")}>
              <h4 className="text-lg font-semibold">About Us</h4>
              <ChevronDown className={`${open.about ? "rotate-180" : "rotate-0"} md:hidden`} />
            </button>
            <ul className={`text-sm opacity-90 mt-3 space-y-2 ${open.about ? "block" : "hidden md:block"}`}>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="#">Company Info</Link></li>
              <li><Link href="#">Careers</Link></li>
              <li><Link href="#">Terms & Conditions</Link></li>
              <li><Link href="#">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Our Services */}
          <div>
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("services")}>
              <h4 className="text-lg font-semibold">Our Services</h4>
              <ChevronDown className={`${open.services ? "rotate-180" : "rotate-0"} md:hidden`} />
            </button>
            <ul className={`text-sm opacity-90 mt-3 space-y-2 ${open.services ? "block" : "hidden md:block"}`}>
              <li><Link href="#">Offers</Link></li>
              <li><Link href="#">Shop By Brand</Link></li>
              <li><Link href="#">Shop By Category</Link></li>
              <li><Link href="#">Popular Products</Link></li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("subscribe")}>
              <h4 className="text-lg font-semibold">Subscribe Us</h4>
              <ChevronDown className={`${open.subscribe ? "rotate-180" : "rotate-0"} md:hidden`} />
            </button>
            <div className={`text-sm opacity-90 mt-3 ${open.subscribe ? "block" : "hidden md:block"}`}>
              <p className="mb-3 max-w-[286px]">Enter your email to receive our latest updates about our products.</p>
              <form className="flex gap-2 flex-wrap">
                <input type="email" placeholder="Email address" className="flex-1 p-2 rounded text-sm text-black" />
                <button className="bg-[#005625] text-white px-4 py-2 rounded text-sm">Subscribe</button>
              </form>
            </div>
          </div>

          {/* Social */}
          <div>
            <button className="w-full flex items-center justify-between md:justify-start" onClick={() => toggle("social")}>
              <h4 className="text-lg font-semibold">Social</h4>
              <ChevronDown className={`${open.social ? "rotate-180" : "rotate-0"} md:hidden`} />
            </button>
            <div className={`mt-3 ${open.social ? "block" : "hidden md:block"}`}>
              <div className="flex gap-2 flex-wrap mt-2">
                <Link href="#"><Image src="/social/facebook.svg" alt="Facebook" width={32} height={32} /></Link>
                <Link href="#"><Image src="/social/instagram.svg" alt="Instagram" width={32} height={32} /></Link>
                <Link href="#"><Image src="/social/linkedin.svg" alt="LinkedIn" width={32} height={32} /></Link>
                <Link href="#"><Image src="/social/twitter.svg" alt="Twitter" width={32} height={32} /></Link>
                <Link href="#"><Image src="/social/youtube.svg" alt="YouTube" width={32} height={32} /></Link>
                <Link href="#"><Image src="/social/tiktok.svg" alt="TikTok" width={32} height={32} /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Strip */}
      <div className="bg-black text-white opacity-90 text-sm flex flex-col md:flex-row items-center justify-between px-6 py-4">
        <p className="mb-2 md:mb-0">© 2024 Direct Care All Rights Reserved</p>
        <div className="mb-2 md:mb-0">
          <Image src="/payments/visa.png" alt="visa" width={160} height={40} />
        </div>
        <p className="text-sm">Developed By Mezzex</p>
      </div>
    </footer>
  );
}
