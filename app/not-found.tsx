// app/not-found.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Search, ArrowLeft, Package, Heart, ShoppingCart, TrendingUp, PhoneCall, Shield } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${encodeURIComponent(searchQuery)}`);
    }
  };
  // Popular Categories
  const categories = [
    { name: 'Baby & Child', href: '/baby-child', icon: Package },
    { name: 'Beauty & Cosmetics', href: '/beauty-cosmetics', icon: Heart },
    { name: 'Vitamins', href: '/vitamins', icon: Shield },
    { name: 'Health & Personal Care', href: '/health-personal-care', icon: Heart }
  ];
  // Popular Pages
  const popularPages = [
    { name: 'Special Offers', href: '/offers' },
    { name: 'New Arrivals', href: '/new-arrivals' },
    { name: 'Best Sellers', href: '/best-sellers' },
    { name: 'Shop by Brand', href: '/brands' }
  ];
  return (
    <div className="min-h-screen bg-white py-4 md:py-12">
      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-6xl">       
        {/* 404 Hero - Compact */}
        <div className="text-center mb-4">         
          {/* 404 Number & Icon */}
          <div className="relative mb-3">
            {/* Background 404 */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
              <div className="text-[180px] font-black text-[#4a6f52] leading-none select-none">
                404
              </div>
            </div> 
            <div className="relative pt-4 ">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#4a6f52]/10 rounded-full mb-2">
                <Package className="w-10 h-10 text-[#4a6f52]" />
              </div>            
              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2">
                Page Not Found
              </h1>
              {/* Description */}
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-1">
                Sorry, we couldn't find the page you're looking for.
              </p>
              <p className="text-sm text-gray-500 max-w-xl mx-auto">
                The health & beauty product or page might have been moved, deleted, or is temporarily unavailable.
              </p>
            </div>
          </div>
          {/* Search Bar - Compact */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands, or categories..."
                className="w-full px-5 py-3 pr-12 border-2 border-gray-300 rounded-full text-sm focus:outline-none focus:border-[#4a6f52] transition-colors" />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#4a6f52] text-white p-2.5 rounded-full hover:bg-[#3d5c43] transition-colors" >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
          {/* Action Buttons - Compact */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-5 py-2.5 border-2 border-[#4a6f52] text-[#4a6f52] rounded-full hover:bg-[#4a6f52] hover:text-white transition-all font-semibold text-sm" >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#4a6f52] text-white rounded-full hover:bg-[#3d5c43] transition-all font-semibold text-sm" >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
            <Link
              href="/offers"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-all font-semibold text-sm" >
              <TrendingUp className="w-4 h-4" />
              View Offers
            </Link>
          </div>
        </div>
        {/* Popular Categories - Compact */}
        <div className="mb-2">
          <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
            Browse Popular Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.href}
                  href={category.href}
                  className="group flex flex-col items-center p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-[#4a6f52] hover:shadow-md transition-all" >
                  <div className="w-12 h-12 bg-[#4a6f52]/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-[#4a6f52] transition-colors">
                    <Icon className="w-6 h-6 text-[#4a6f52] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-center text-xs font-bold text-gray-800 group-hover:text-[#4a6f52] transition-colors">
                    {category.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        {/* Quick Links - Compact */}
        <div className="mb-2">
          <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
            Quick Links
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {popularPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-[#4a6f52] hover:text-white transition-all font-medium text-xs" >
                {page.name}
              </Link>
            ))}
          </div>
        </div>
        {/* Trust Features - Compact */}
        <div className="bg-gradient-to-br from-[#4a6f52]/5 to-emerald-50 rounded-2xl p-5">
          <div className="grid md:grid-cols-3 gap-4">           
            {/* Fast Delivery */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 bg-[#4a6f52] rounded-full flex items-center justify-center mb-2">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-0.5">Fast & Reliable Delivery</h3>
              <p className="text-gray-600 text-xs">
                Standard or next-day delivery options available.
              </p>
            </div>
            {/* Returns */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 bg-[#4a6f52] rounded-full flex items-center justify-center mb-2">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-0.5">30-Day Hassle-Free Returns</h3>
              <p className="text-gray-600 text-xs">
                Shop with confidence, return within 30 days if needed.
              </p>
            </div>
            {/* Support */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 bg-[#4a6f52] rounded-full flex items-center justify-center mb-2">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-0.5">Dedicated Customer Support</h3>
              <p className="text-gray-600 text-xs">
                Our team is available [Mon-Sat, 8 AM - 8 PM]
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
