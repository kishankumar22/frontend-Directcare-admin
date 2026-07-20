// app/offers/page.tsx
import Link from "next/link";
import { Tag, Clock, Gift, ShoppingBag, Percent, BadgePercent, TrendingUp } from "lucide-react";

interface Discount {
  id: string;
  name: string;
  slug: string;
  discountType: string;
  usePercentage: boolean;
  discountAmount: number;
  discountPercentage?: number;
  maximumDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  requiresCouponCode: boolean;
  desktopBannerImageUrl?: string;
  mobileBannerImageUrl?: string;
  productCount?: number;
  adminComment?: string;
}

function formatDiscount(d: Discount): string {
  if (d.usePercentage && d.discountPercentage) return `${d.discountPercentage}% OFF`;
  if (d.discountAmount > 0) return `£${d.discountAmount.toFixed(2)} OFF`;
  return "Special Offer";
}

function getDaysLeft(endDate?: string): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export default async function OffersPage() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not defined");

  let discounts: Discount[] = [];
  try {
    const res = await fetch(
      `${baseUrl}/api/Discounts/public`,
      {
        cache: "no-store",
      }
    );
    if (res.ok) {
      const json = await res.json();
      discounts = json?.data ?? [];
    }
  } catch { }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* HERO BANNER */}
      <div className="relative w-full overflow-hidden border-b border-[#33492f] bg-[#445D41]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[#111] md:block [clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]" />
        <BadgePercent className="absolute -left-4 top-2 h-24 w-24 rotate-12 text-white/5" />
        <ShoppingBag className="absolute right-[34%] top-5 hidden h-16 w-16 -rotate-12 text-white/5 md:block" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:min-h-[118px] md:flex-row md:items-center md:justify-between md:py-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
              <Gift className="h-3.5 w-3.5" />
              Exclusive Deals
            </div>

            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-black leading-tight text-white md:text-3xl">
              <span>Today's</span>
              <span className="rounded bg-white px-2 py-0.5 text-[#445D41] shadow-sm">Offers</span>
              <span>&amp; Deals</span>
            </h1>

            <p className="mt-1 max-w-xl text-xs font-medium leading-snug text-white/80 md:text-sm">
              Save on active health and beauty deals, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:w-[360px] md:flex-shrink-0">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111]/90 px-3 py-2.5 shadow-lg">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <BadgePercent className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black leading-none text-white">{discounts.length}</div>
                <div className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-white/55">Active Deals</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111]/90 px-3 py-2.5 shadow-lg">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black leading-none text-white">{discounts.reduce((acc, d) => acc + (d.productCount ?? 0), 0)}+</div>
                <div className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-white/55">Products</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-1 pb-2">

        {discounts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100">
            <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">No active offers right now</h2>
            <p className="text-gray-500 mt-2">Check back soon — new deals are added regularly!</p>
            <Link href="/" className="mt-8 inline-block px-8 py-3 bg-[#111827] text-white rounded-lg font-bold hover:bg-black transition-colors">
              Shop All Products
            </Link>
          </div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#445D41] rounded-full"></div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900">All Offers</h2>
                  <span className="px-2.5 py-0.5 bg-[#445D41]/10 text-[#445D41] text-[10px] font-black uppercase tracking-wider rounded">
                    {discounts.length} Live
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {discounts.map(d => (
                  <DiscountCard key={d.id} discount={d} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function DiscountCard({ discount: d }: { discount: Discount }) {
  const daysLeft = getDaysLeft(d.endDate);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 3;
  const bannerUrl = d.desktopBannerImageUrl || d.mobileBannerImageUrl;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  
 const adminComment = stripHtml(d.adminComment ?? "").replace(/&amp;/g, "&");

  const isProductLevel = d.discountType === "AssignedToProducts" || d.discountType === "AssignedToCategories" || d.discountType === "UpToPercentage";
  const href = isProductLevel && d.slug ? `/offers/${d.slug}` : "#";

  return (
    <Link
      href={href}
      className={`group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 ${isProductLevel ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Banner Image */}
      <div className="relative w-full bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
        {bannerUrl ? (
          <>
            <img
              src={`${apiBase}${bannerUrl}`}
              alt={d.name}
              className="w-full h-auto block group-hover:scale-105 transition-transform duration-500 ease-in-out"
            />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />
          </>
        ) : (
          <div className={`relative w-full aspect-[16/8] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center`}>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent"></div>
            <Percent className={`h-16 w-16 text-gray-200 opacity-50 transform group-hover:scale-110 transition-transform duration-500`} />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="px-5 pt-5 pb-3 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-[#445D41] transition-colors line-clamp-2 mb-3">
          {d.name}
        </h3>

        {adminComment && (
          <p className="text-xs font-medium text-gray-600 line-clamp-2 mb-3">
            {adminComment}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-2 mt-auto">
          {/* New RED Offer Badge */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-500 text-white px-2 py-1 rounded shadow-sm">
            <Tag className="h-3 w-3" />
            {formatDiscount(d)}
          </span>

          {d.productCount != null && d.productCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200/60">
              <ShoppingBag className="h-3 w-3" />
              {d.productCount} Products
            </span>
          )}
          {daysLeft !== null && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded border ${isExpiringSoon ? "bg-red-50 text-red-600 border-red-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
              <Clock className="h-3 w-3" />
              {daysLeft === 0 ? "Ends today!" : `${daysLeft}d left`}
            </span>
          )}
          {d.requiresCouponCode && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-900 text-white px-2 py-1 rounded">
              <Tag className="h-3 w-3" />
              Coupon
            </span>
          )}
        </div>

        <div>
          {/* CTA */}
          {isProductLevel && (
            <div className="pt-1">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#445D41] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all group-hover:bg-[#33492f] group-hover:shadow-md">
                Shop Now
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
