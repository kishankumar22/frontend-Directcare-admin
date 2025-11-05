"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, Heart, ShoppingCart, User, X, ChevronDown, ChevronRight, Truck, Package, Bike } from "lucide-react";
import MegaMenu from "./MegaMenu";


interface Category {
  id: string;
  name: string;
  slug: string;
  parentCategoryId?: string | null;
  subCategories?: Category[];
}

export default function Header({
  ssrCategories = [],
}: {
  ssrCategories?: Category[];
}) {
  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [searchValue, setSearchValue] = useState("");
  const [categories, setCategories] = useState<Category[]>(ssrCategories);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [hovered, setHovered] = useState(false);
  const [showTopBar, setShowTopBar] = useState(true);
  const lastScroll = useRef(0);
  const scrollDirection = useRef<"up" | "down" | null>(null);

  const mobileTopMessages = [
  {
    icon: <Truck size={20} />,
    title: "NEXT DAY DELIVERY",
    subtitle: "GET IT JUST FOR £4.49",
    link: "/delivery/next-day",
  },
  {
    icon: <Truck size={20} />,
    title: "STANDARD DELIVERY",
    subtitle: "FREE SHIPPING OVER £35",
    link: "/delivery/standard",
  },
  {
    icon: <Package size={20} />,
    title: "CLICK & COLLECT",
    subtitle: "FREE ON ORDERS OVER £30",
    link: "/delivery/click-and-collect",
  },
  {
    icon: <Bike size={20} />,
    title: "SPECIAL DELIVERY GUARANTEED-1PM",
    subtitle: "ROYAL MAIL SPECIAL DELIVERY FOR £18.99",
    link: "/delivery/special",
  },
];

const [currentMsg, setCurrentMsg] = useState(0);

useEffect(() => {
  const t = setInterval(() => {
    setCurrentMsg((p) => (p + 1) % mobileTopMessages.length);
  }, 3000);

  return () => clearInterval(t);
}, []);

  

  // mobile accordion open states (for nested accordions)
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  const [openChildren, setOpenChildren] = useState<Record<string, boolean>>({});
  


  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (current > lastScroll.current + 1) {
        scrollDirection.current = "down";
      } else if (current < lastScroll.current - 8) {
        scrollDirection.current = "up";
      }

      if (current >= maxScroll - 2) scrollDirection.current = "down";

      if (scrollDirection.current === "down") {
        if (current > 5) setShowTopBar(false);
      } else if (scrollDirection.current === "up") {
        if (current < maxScroll - 80) setShowTopBar(true);
      }

      lastScroll.current = current;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // fetch if SSR not provided
  useEffect(() => {
    if (ssrCategories.length > 0) return;

    const fetchCategories = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/Categories?includeInactive=false&includeSubCategories=true`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.success) {
          const topCategories = json.data.filter((cat: Category) => !cat.parentCategoryId);
          setCategories(topCategories);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };

    fetchCategories();
  }, [ssrCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // implement search routing or logic here
    console.log("search:", searchValue);
  };

  const openMenu = (category: Category) => {
    setActiveCategory(category);
    setHovered(true);
  };
  const closeMenu = () => {
    setHovered(false);
    setActiveCategory(null);
  };

  // mobile drawer helpers
  const toggleParent = (id: string) =>
    setOpenParents((s) => ({ ...s, [id]: !s[id] }));
  const toggleChild = (id: string) =>
    setOpenChildren((s) => ({ ...s, [id]: !s[id] }));

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50 w-full">
      {/* TOP INFO BAR */}
     {/* ✅ TOP INFO BAR */}
<div
  className={`bg-[#445D41] text-white w-full z-50 transition-all duration-300 overflow-hidden ${
    showTopBar ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
  }`}
>

  {/* ✅ MOBILE — AUTO SLIDER, DESKTOP UNTOUCHED */}
{/* ✅ MOBILE — AUTO SLIDER (EXACT ALIGNMENT) */}
<div className="md:hidden py-2 px-4 overflow-hidden">
  <div
    key={currentMsg}
    className="
      flex items-center justify-center
      gap-3 py-1 transition-all duration-500 ease-out
    "
  >
    {/* ICON */}
    <span className="text-white text-xl flex-shrink-0">
      {mobileTopMessages[currentMsg].icon}
    </span>

    {/* TEXT BLOCK (title on top, subtitle below) */}
    <div className="flex flex-col text-left leading-tight">
      <span className="font-bold text-[13px] tracking-wide text-white">
        {mobileTopMessages[currentMsg].title}
      </span>

      <span className="text-[11px] text-white opacity-90">
        {mobileTopMessages[currentMsg].subtitle}
      </span>
    </div>
  </div>
</div>


  {/* ✅ DESKTOP — EXACT ORIGINAL (TOUCH MAT KARNA) */}
 {/* ✅ DESKTOP — EXACT ORIGINAL (CLEAN + NO WARNINGS) */}
<div className="hidden md:block">
  <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 text-center py-2 px-4 gap-4">

    <a href="/delivery/next-day" className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition">
      <span className="text-white flex-shrink-0"><Truck size={20} /></span>
      <div className="text-left leading-tight">
        <h4 className="font-bold text-[13px] tracking-wide">NEXT DAY DELIVERY</h4>
        <p className="text-[11px] opacity-90">GET IT JUST FOR £4.49</p>
      </div>
    </a>

    <a href="/delivery/standard" className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition">
      <span className="text-white flex-shrink-0"><Truck size={20} /></span>
      <div className="text-left leading-tight">
        <h4 className="font-bold text-[13px] tracking-wide">STANDARD DELIVERY</h4>
        <p className="text-[11px] opacity-90">FREE SHIPPING OVER £35</p>
      </div>
    </a>

    <a href="/delivery/click-and-collect" className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition">
      <span className="text-white flex-shrink-0"><Package size={20} /></span>
      <div className="text-left leading-tight">
        <h4 className="font-bold text-[13px] tracking-wide">CLICK & COLLECT</h4>
        <p className="text-[11px] opacity-90">FREE ON ORDERS OVER £30</p>
      </div>
    </a>

    <a href="/delivery/special" className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition">
      <span className="text-white flex-shrink-0"><Bike size={20} /></span>
      <div className="text-left leading-tight">
        <h4 className="font-bold text-[13px] tracking-wide">SPECIAL DELIVERY 1PM</h4>
        <p className="text-[11px] opacity-90">ROYAL MAIL SPECIAL DELIVERY FOR £18.99</p>
      </div>
    </a>

  </div>
</div>


</div>


      {/* MAIN HEADER ROW */}
      <div className="w-full relative">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden mr-2 text-gray-700 hover:text-green-800"
            >
              <Menu size={24} />
            </button>

            <Link href="/" className="flex items-center">
              <Image src="/logo/logo.png" alt="Direct Care Logo" width={190} height={60} className="object-contain" />
            </Link>
          </div>
          {/* ✅ MOBILE ICONS (wishlist, cart, user) */}
<div className="flex items-center gap-4 md:hidden">

  {/* Wishlist */}
  <button className="text-gray-700 hover:text-green-800 transition">
    <Heart size={22} />
  </button>

  {/* Cart */}
  <button className="relative text-gray-700 hover:text-green-800 transition">
    <ShoppingCart size={22} />
    <span className="absolute -top-1 -right-2 bg-[#445D41] text-white text-[10px] rounded-full px-1.5">
      0
    </span>
  </button>

  {/* User */}
  <button className="text-gray-700 hover:text-green-800 transition">
    <User size={22} />
  </button>

</div>


          {/* Search - mobile & desktop behavior */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 px-4 md:px-6">

            <div className="relative max-w-3xl mx-auto">
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full border border-[#445D41] rounded-md px-4 py-2 pr-[20.25rem] outline-none focus:ring-0 focus:border-[#445D41] text-sm"
              />
              <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#445D41] hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm">
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Icons */}
          <div className="hidden md:flex items-center gap-5 text-gray-700">
            <button className="hover:text-green-800 transition"><Heart size={22} /></button>
            <button className="hover:text-green-800 transition relative">
              <ShoppingCart size={22} />
              <span className="absolute -top-1 -right-2 bg-[#445D41] text-white text-xs rounded-full px-1.5">0</span>
            </button>
            <button className="hover:text-green-800 transition"><User size={22} /></button>
          </div>
        </div>

        {/* Categories Desktop */}
        <div className="hidden md:block relative" onMouseLeave={closeMenu}>
          <nav className="flex items-center -space-x-2 h-12 bg-[#445D41] text-white px-4">
           {categories.map((cat) => (
  <Link
    key={cat.id}                    // ✅ FIX
    href={`/category/${cat.slug}`}
    onMouseEnter={() => {
      if (cat.subCategories && cat.subCategories.length > 0) {
        openMenu(cat);
      } else {
        setHovered(false);
        setActiveCategory(null);
      }
    }}
    className={`cursor-pointer pl-[3.75rem] py-2 rounded transition ${
      activeCategory?.id === cat.id ? "text-card-foreground" : "hover:text-black"
    }`}
  >
    {cat.name}
  </Link>
))}


            
          </nav>

          {hovered &&
 activeCategory &&
 activeCategory.subCategories &&
 activeCategory.subCategories.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50" onMouseEnter={() => setHovered(true)}>
              <MegaMenu activeMainCategory={activeCategory} />
            </div>
          )}
        </div>
      </div>

      {/* MOBILE LEFT DRAWER */}
      {/* overlay */}
      <div className={`fixed inset-0 z-50 transition-opacity ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${menuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMenuOpen(false)}
        />
        {/* drawer */}
        <aside
          className={`absolute top-0 left-0 h-full w-[92vw] max-w-sm bg-white transform transition-transform shadow-xl overflow-y-auto
            ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo/logo.png" alt="logo" width={180} height={80} className="object-contain" />
            </Link>
            <button onClick={() => setMenuOpen(false)} className="text-gray-700"><X size={22} /></button>
          </div>

          {/* Search inside drawer */}
          
          {/* Categories accordion */}
          <nav className="p-2">
            {categories.map((parent) => (
              <div key={parent.id} className="border-b">

  {/* ✅ If parent has subCategories → show accordion */}
  {parent.subCategories && parent.subCategories.length > 0 ? (
    <button
      onClick={() => toggleParent(parent.id)}
      className="w-full flex items-center justify-between px-4 py-3 text-left"
    >
      <span className="font-medium">{parent.name}</span>
      <ChevronDown
        size={18}
        className={`${openParents[parent.id] ? "rotate-180" : "rotate-0"} transition-transform`}
      />
    </button>
  ) : (
    /* ✅ If NO subcategories → direct link (NO arrow, NO accordion) */
    <Link
      href={`/category/${parent.slug ?? "#"}`}
      onClick={() => setMenuOpen(false)}
      className="block px-4 py-3 font-medium"
    >
      {parent.name}
    </Link>
  )}

  {/* ✅ Render subcategories ONLY if present */}
  {openParents[parent.id] &&
    parent.subCategories &&
    parent.subCategories.length > 0 && (
      <div className="pl-4 pr-4 pb-3">
        {parent.subCategories.map((sub) => (
          <div key={sub.id} className="mb-1">

            {/* ✅ If sub-sub-categories exist → accordion */}
            {sub.subCategories && sub.subCategories.length > 0 ? (
              <>
                <button
                  onClick={() => toggleChild(sub.id)}
                  className="w-full flex items-center justify-between py-2 text-sm text-gray-700"
                >
                  <span>{sub.name}</span>
                  <ChevronRight
                    size={16}
                    className={`${openChildren[sub.id] ? "rotate-90" : "rotate-0"} transition-transform`}
                  />
                </button>

                {openChildren[sub.id] && (
                  <div className="pl-3">
                    {sub.subCategories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/category/${c.slug ?? "#"}`}
                        onClick={() => setMenuOpen(false)}
                        className="block py-1 text-sm text-gray-600"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ✅ If NO sub-sub-categories → direct link */
              <Link
                href={`/category/${sub.slug ?? "#"}`}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm text-gray-700"
              >
                {sub.name}
              </Link>
            )}
          </div>
        ))}
      </div>
    )}
</div>

            ))}
          </nav>

          {/* Footer area inside drawer: quick links & social */}
          <div className="p-4 border-t mt-4">
            <div className="mb-3">
              <Link href="/account" className="block py-2 text-sm">My Account</Link>
              <Link href="/orders" className="block py-2 text-sm">Orders</Link>
              <Link href="/cart" className="block py-2 text-sm">Cart</Link>
            </div>
            <div className="flex gap-3 mt-2">
              <Link href="#"><Image src="/social/facebook.svg" alt="fb" width={28} height={28} /></Link>
              <Link href="#"><Image src="/social/instagram.svg" alt="ig" width={28} height={28} /></Link>
              <Link href="#"><Image src="/social/twitter.svg" alt="tw" width={28} height={28} /></Link>
            </div>
          </div>
        </aside>
      </div>
    </header>
  );
}
