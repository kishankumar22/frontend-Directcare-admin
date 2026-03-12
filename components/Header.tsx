"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, Heart, ShoppingCart, User, X, ChevronDown, ChevronRight, Truck, Package, Bike, Star, BadgePercent } from "lucide-react";
import MegaMenu from "./MegaMenu";
import { useToast } from "@/components/toast/CustomToast";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/app/hooks/useDebounce";
import { usePathname } from "next/navigation";
interface Category {
  id: string;
  name: string;
  slug: string;
  parentCategoryId?: string | null;
  subCategories?: Category[];
}
export default function Header({
  ssrCategories = [],
  className = "",
}: {
  ssrCategories?: Category[];
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
 const [categories, setCategories] = useState<Category[]>(
  ssrCategories.filter((c: any) => c.showOnHomepage === true)
);
 // Mobile drawer shows ALL parent categories (not just homepage ones)
const [mobileCategories, setMobileCategories] = useState<Category[]>(
  ssrCategories
    .filter((c: any) => !c.parentCategoryId && c.showOnHomepage === true)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
);

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [hovered, setHovered] = useState(false);
  const [hideTopBar, setHideTopBar] = useState(false);
  
  const lastScroll = useRef(0);
  const megaWrapperRef = useRef<HTMLDivElement>(null);

  const toast = useToast();
  const { cartCount, isInitialized } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();


 const handleAccountClick = () => {
  router.push("/account");
};


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
const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />;
        }
        if (i === fullStars && hasHalf) {
          return <Star key={i} size={12} className="fill-yellow-400/50 text-yellow-400" />;
        }
        return <Star key={i} size={12} className="text-gray-300" />;
      })}
    </div>
  );
};

const getDiscountedPrice = (price: number, discountPercentage: number) => {
  const discounted = price - (price * discountPercentage) / 100;
  return Number(discounted.toFixed(2));
};

const pathname = usePathname();
useEffect(() => {
  // Route change hua → MegaMenu band
  setHovered(false);
  setActiveCategory(null);
}, [pathname]);

  const [currentMsg, setCurrentMsg] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentMsg((p) => (p + 1) % mobileTopMessages.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const [results, setResults] = useState<any[]>([]);
const [searchLoading, setSearchLoading] = useState(false);
const [showSearchDropdown, setShowSearchDropdown] = useState(false);
const debouncedSearch = useDebounce(searchValue, 400);
useEffect(() => {
  if (!debouncedSearch || debouncedSearch.length < 1) {
    setResults([]);
    setShowSearchDropdown(false);
    return;
  }
  const fetchSearchResults = async () => {
    try {
      setSearchLoading(true);
      const res = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL}/api/Products/quick-search?query=${debouncedSearch}&limit=6`
      );
    const json = await res.json();
console.log("SEARCH API RESPONSE 👉", json);

      if (json.success) {
        setResults(json.data);
        setShowSearchDropdown(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  fetchSearchResults();
}, [debouncedSearch]);

const searchRef = useRef<HTMLDivElement>(null);
const mobileSearchRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const insideDesktop = searchRef.current?.contains(e.target as Node);
    const insideMobile = mobileSearchRef.current?.contains(e.target as Node);
    if (!insideDesktop && !insideMobile) {
      setShowSearchDropdown(false);
      setMobileSearchOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () =>
    document.removeEventListener("mousedown", handleClickOutside);
}, []);


  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  const [openChildren, setOpenChildren] = useState<Record<string, boolean>>({});

  // ⭐ SMOOTH SCROLL
  useEffect(() => {
    let rafId: number;
    
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      
      cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        if (currentScroll <= 10) {
          setHideTopBar(false);
        } else if (currentScroll > lastScroll.current && currentScroll > 150) {
          setHideTopBar(true);
        } else if (currentScroll < lastScroll.current - 10) {
          setHideTopBar(false);
        }
        
        lastScroll.current = currentScroll;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

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
          const allParents = json.data
  .filter((cat: Category) => !cat.parentCategoryId)
  .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const topCategories = allParents.filter((cat: any) => cat.showOnHomepage === true);

setCategories(topCategories);
const homepageParents = allParents.filter(
  (cat: any) => cat.showOnHomepage === true
);

setMobileCategories(homepageParents);

        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };

    fetchCategories();
  }, [ssrCategories]);

  // Lock body scroll when drawer or mobile search is open
  useEffect(() => {
    document.body.style.overflow = (menuOpen || mobileSearchOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen, mobileSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();

  if (!searchValue.trim()) return;

  router.push(`/search?q=${encodeURIComponent(searchValue)}`);
  setShowSearchDropdown(false);
  setMobileSearchOpen(false);
};


  const openMenu = (category: Category) => {
    setActiveCategory(category);
    setHovered(true);
  };

  const closeMenu = () => {
    setHovered(false);
    setActiveCategory(null);
  };

  const toggleParent = (id: string) =>
    setOpenParents((s) => ({ ...s, [id]: !s[id] }));

  const toggleChild = (id: string) =>
    setOpenChildren((s) => ({ ...s, [id]: !s[id] }));

  return (
    <header
      className="fixed left-0 right-0 z-50"
      style={{
        top: (hideTopBar && !menuOpen) ? '-52px' : '0',
        transition: 'top 300ms ease-in-out',
      }}
    >
      {/* ⭐ TOP BAR */}
      <div className="bg-[#445D41] text-white w-full h-[52px]">
        {/* Mobile Slider */}
        {isClient && (
          <div className="lg:hidden h-full flex items-center px-4">
            <div className="flex items-center justify-center gap-3 w-full">
              <span className="text-white text-xl flex-shrink-0">
                {mobileTopMessages[currentMsg].icon}
              </span>
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
        )}

        {/* Desktop Grid */}
        <div className="hidden lg:block h-full">
          <div className="max-w-7xl mx-auto grid grid-cols-4 text-center h-full items-center px-4 gap-4">
            <a 
              href="/delivery/next-day" 
              className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition-colors duration-200"
            >
              <span className="text-white flex-shrink-0">
                <Truck size={20} />
              </span>
              <div className="text-left leading-tight">
                <h4 className="font-bold text-[13px] tracking-wide">NEXT DAY DELIVERY</h4>
                <p className="text-[11px] opacity-90">GET IT JUST FOR £4.49</p>
              </div>
            </a>
            <a 
              href="/delivery/standard" 
              className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition-colors duration-200"
            >
              <span className="text-white flex-shrink-0">
                <Truck size={20} />
              </span>
              <div className="text-left leading-tight">
                <h4 className="font-bold text-[13px] tracking-wide">STANDARD DELIVERY</h4>
                <p className="text-[11px] opacity-90">FREE SHIPPING OVER £35</p>
              </div>
            </a>
            <a 
              href="/delivery/click-and-collect" 
              className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition-colors duration-200"
            >
              <span className="text-white flex-shrink-0">
                <Package size={20} />
              </span>
              <div className="text-left leading-tight">
                <h4 className="font-bold text-[13px] tracking-wide">CLICK & COLLECT</h4>
                <p className="text-[11px] opacity-90">FREE ON ORDERS OVER £30</p>
              </div>
            </a>
            <a 
              href="/delivery/special" 
              className="flex items-center gap-3 cursor-pointer hover:bg-[#334a2c] py-2 px-3 rounded transition-colors duration-200"
            >
              <span className="text-white flex-shrink-0">
                <Bike size={20} />
              </span>
              <div className="text-left leading-tight">
                <h4 className="font-bold text-[13px] tracking-wide">SPECIAL DELIVERY 1PM</h4>
                <p className="text-[11px] opacity-90">ROYAL MAIL SPECIAL DELIVERY FOR £18.99</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ⭐ MAIN HEADER */}
      <div className="bg-white shadow-md">
        <div className="flex items-center h-14 md:h-16 px-3 md:px-6 lg:px-20 gap-2">

          {/* LEFT: Hamburger + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden text-gray-700 hover:text-green-800 p-1"
            >
              <Menu size={22} />
            </button>
            <Link href="/" className="flex items-center">
              <Image
                src="/logo/logo.png"
                alt="Direct Care Logo"
                width={150}
                height={50}
                className="h-8 w-auto md:h-[80px] md:w-[240px] object-contain"
                priority
              />
            </Link>
          </div>

          {/* CENTER: Spacer — search is icon-triggered overlay */}
          <div className="flex-1 md:hidden" />

          {/* RIGHT: Mobile Icons (search + wishlist + cart + account) */}
          <div className="flex items-center gap-1.5 md:hidden flex-shrink-0">
            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label="Search"
              className={`p-2 rounded-full transition ${mobileSearchOpen ? 'bg-[#445D41] text-white' : 'text-gray-700 hover:text-green-800'}`}
            >
              <Search size={20} />
            </button>
            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-1 text-gray-700 hover:text-red-500 transition">
              <Heart
                size={22}
                className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <button
              className="relative text-gray-700 hover:text-green-800 transition p-1"
              onClick={() => router.push("/cart")}
            >
              <ShoppingCart size={22} />
              {isInitialized && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-[#445D41] text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {cartCount}
                </span>
              )}
            </button>
            {isAuthenticated && user ? (
              <button onClick={handleAccountClick} className="flex items-center gap-1 text-gray-700 p-1">
                <div className="w-7 h-7 rounded-full bg-[#445D41] text-white flex items-center justify-center text-[11px] font-bold">
                  {user.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
              </button>
            ) : (
              <button
                onClick={() => router.push("/account")}
                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#445D41] rounded-full"
              >
                Login
              </button>
            )}
          </div>

          {/* Search - Desktop */}
         <form
  onSubmit={handleSearch}
  className="hidden md:flex flex-1 px-4 md:px-6"
>
  <div
    ref={searchRef}
    className="relative max-w-[40rem] mx-auto w-full"
  >
    <input
      type="text"
      placeholder="Search products..."
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
      onFocus={() =>
        results.length > 0 && setShowSearchDropdown(true)
      }
     className=" w-full rounded-md px-4 py-2 pr-12 text-sm border border-[#445D41] focus:outline-none focus:ring-2 focus:ring-[#445D41] focus:border-[#445D41] "
    />

    <button
      type="submit"
      className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#445D41] text-white px-3 py-1.5 rounded"
    >
      <Search size={16} />
    </button>

    {/* 🔽 SEARCH DROPDOWN */}
    {showSearchDropdown && (
  <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-xl z-[9999]">
    {searchLoading && (
      <div className="p-4 text-sm text-gray-500">
        Searching...
      </div>
    )}

    {!searchLoading && results.length === 0 && (
      <div className="p-4 text-sm text-gray-500">
        No products found
      </div>
    )}

    {!searchLoading &&
      results.map((item) => (
        <Link
          key={item.id}
         href={`/products/${item.slug}`}
          onClick={() => {
            setShowSearchDropdown(false);
            setSearchValue("");
          }}
          className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
        >
         {/* IMAGE FIX */}
<img
  src={
    item.mainImageUrl?.startsWith("http")
      ? item.mainImageUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${item.mainImageUrl}`
  }
  alt={"img"}
  className="w-10 h-10 object-contain"
/>

{/* NAME + CATEGORY */}
{/* NAME, CATEGORY, PRICE + DISCOUNT */}
<div className="flex flex-col">
  <div className="flex items-center gap-2 flex-wrap">
  <span className="text-sm font-medium text-gray-800 line-clamp-1">
    {item.name}
  </span>

  {item.hasDiscount &&
    typeof item.discountPercentage === "number" &&
    item.discountPercentage > 0 && (
      <span className="text-[11px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-semibold whitespace-nowrap">
        {item.discountPercentage}% Off
      </span>
    )}

  {typeof item.averageRating === "number" &&
    item.averageRating > 0 && (
      <div className="flex items-center gap-0.5">
        {renderStars(item.averageRating)}
        <span className="text-[11px] text-gray-500">
          ({item.approvedReviewCount ?? item.reviewCount ?? 0})
        </span>
      </div>
    )}
</div>


  <span className="text-xs text-gray-500">
    {item.categoryName}
  </span>

  {/* PRICE */}
 <div className="flex items-center gap-2 mt-0.5 flex-wrap">
  {item.hasDiscount &&
  typeof item.discountPercentage === "number" &&
  item.discountPercentage > 0 ? (
    <>
      {/* Discounted Price */}
      <span className="text-sm font-semibold text-[#445D41]">
        £{getDiscountedPrice(item.price, item.discountPercentage)}
      </span>

      {/* Original Price */}
      <span className="text-xs text-gray-400 line-through">
        £{Number(item.price).toFixed(2)}
      </span>
    </>
  ) : (
    <span className="text-sm font-semibold text-[#445D41]">
      £{Number(item.price).toFixed(2)}
    </span>
  )}

  {/* 🎁 Loyalty Points */}
  {item.loyaltyPointsMessage && (
    <span className="text-[11px] px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium whitespace-nowrap">
      {item.loyaltyPointsMessage}
    </span>
  )}
</div>

</div>
{/* STOCK BADGE */}
<div className="ml-auto flex-shrink-0 self-start">

  {item.inStock ? (
    <span className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">
      In Stock
    </span>
  ) : (
    <span className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-600 font-semibold">
      Out of Stock
    </span>
  )}
</div>

        </Link>
      ))}
  </div>
)}

  </div>
</form>


          {/* Desktop Icons */}
          <div className="hidden md:flex items-center gap-5 text-gray-700">
            <Link href="/wishlist" className="relative hover:text-red-500 transition">
              <Heart
                size={22}
                className={wishlistCount > 0 ? "fill-red-500 text-red-500" : ""}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link href="/cart">
              <button className="hover:text-green-800 transition relative">
                <ShoppingCart size={22} />
                {isInitialized && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#445D41] text-white text-xs rounded-full px-1.5">
                    {cartCount}
                  </span>
                )}
              </button>
            </Link>
           {isAuthenticated && user ? (
  <button
    onClick={handleAccountClick}
    className="flex items-center gap-2 hover:text-green-800 transition"
  >
    <User size={20} />
    <span className="text-sm font-medium text-gray-700">
       {user.fullName ?? "User"}
    </span>
  </button>
) : (
  <button
    onClick={() => router.push("/account")}
    className="px-3 py-1 text-xs font-semibold text-[#445D41] border border-[#445D41] rounded-md hover:bg-[#445D41] hover:text-white transition"
  >
    Login
  </button>
)}


          </div>
        </div>

        {/* ✅ DESKTOP CATEGORIES */}
        <div
  ref={megaWrapperRef}
  className="hidden md:block relative"
  onMouseLeave={() => {
    setHovered(false);
    setActiveCategory(null);
  }}
>

         <nav className="flex items-center h-9 border-y-2 text-sm font-bold border-[#445d41] text-black pl-20 gap-6">
          
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="relative"
               onMouseEnter={() => {
  if (cat.subCategories?.length) {
    setActiveCategory(cat);
    setHovered(true);
  } else {
    setHovered(false);
    setActiveCategory(null);
  }
}}

              >
                <Link
                  href={`/category/${cat.slug}`}
                  className={`flex items-center gap-0 cursor-pointer py-2 transition-colors ${
                    activeCategory?.id === cat.id ? "text-[#445D41]" : "hover:text-[#445D41]"
                  }`}
                >
                  {cat.name}
                  {cat.subCategories && cat.subCategories.length > 0 && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ease-in-out ${
                        activeCategory?.id === cat.id && hovered ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  )}
                </Link>
              </div>
            ))}
             {/* 🔥 OFFERS — RIGHT END */}
  <Link
    href="/offers"
    className=" flex items-center gap-1 py-2 text-[#c62828] hover:text-red-700 transition-colors"
  >
    <BadgePercent size={14} />
    Offers
  </Link>
          </nav>

          {/* Mega Menu */}
         {hovered &&
  activeCategory &&
  activeCategory.subCategories &&
  activeCategory.subCategories.length > 0 && (
   <div className="absolute left-0 right-0 top-full">
  
  {/* FULL WIDTH BACKGROUND (NON-HOVER) */}
  <div className="absolute inset-0 bg-white shadow-lg" />

  {/* HOVER AREA (LIMITED WIDTH) */}
  <div
    className="relative max-w-7xl mx-auto"
    onMouseLeave={() => {
      setHovered(false);
      setActiveCategory(null);
    }}
  >
    <MegaMenu activeMainCategory={activeCategory} />
  </div>

</div>

)}

        </div>
      </div>

      {/* ✅ MOBILE SEARCH OVERLAY — slides down from header */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-xl z-50"
        >
          <div className="px-3 py-3">
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search products…"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => results.length > 0 && setShowSearchDropdown(true)}
                  className="w-full rounded-full pl-9 pr-4 py-2 text-sm border border-[#445D41] focus:outline-none focus:ring-2 focus:ring-[#445D41]"
                />
              </div>
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(false); setSearchValue(""); setShowSearchDropdown(false); }}
                className="p-1.5 text-gray-500 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </form>

            {showSearchDropdown && (
              <div className="mt-2 bg-white border rounded-xl shadow-xl max-h-[55vh] overflow-y-auto">
                {searchLoading && <div className="p-4 text-sm text-gray-500">Searching…</div>}
                {!searchLoading && results.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">No products found</div>
                )}
                {!searchLoading && results.map((item) => (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    onClick={() => { setShowSearchDropdown(false); setSearchValue(""); setMobileSearchOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <img
                      src={item.mainImageUrl?.startsWith("http") ? item.mainImageUrl : `${process.env.NEXT_PUBLIC_API_URL}${item.mainImageUrl}`}
                      alt="img"
                      className="w-10 h-10 object-contain flex-shrink-0 rounded"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="text-xs text-gray-500">{item.categoryName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.hasDiscount && typeof item.discountPercentage === "number" && item.discountPercentage > 0 ? (
                          <>
                            <span className="text-sm font-semibold text-[#445D41]">£{getDiscountedPrice(item.price, item.discountPercentage)}</span>
                            <span className="text-xs text-gray-400 line-through">£{Number(item.price).toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold text-[#445D41]">£{Number(item.price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    {item.inStock
                      ? <span className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 font-semibold flex-shrink-0">In Stock</span>
                      : <span className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-600 font-semibold flex-shrink-0">Out</span>
                    }
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer Panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-[82vw] max-w-[320px] bg-white flex flex-col transform transition-transform duration-300 shadow-2xl ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          {/* ── Header ── */}
          <div className="bg-white px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-200">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <Image src="/logo/logo.png" alt="logo" width={130} height={50} className="object-contain" />
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── User Section ── */}
          <div className="bg-green-50 px-4 py-3 flex items-center gap-3 border-b border-green-100 flex-shrink-0">
            {isAuthenticated && user ? (
              <>
                <div className="w-10 h-10 rounded-full bg-[#445D41] text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                  {user.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">Hello, {user.firstName}!</p>
                  <button
                    onClick={() => { handleAccountClick(); setMenuOpen(false); }}
                    className="text-xs text-[#445D41] font-medium hover:underline"
                  >
                    View Account →
                  </button>
                </div>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300 rounded-full hover:bg-red-50 transition flex-shrink-0"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => { router.push("/account"); setMenuOpen(false); }}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-[#445D41] rounded-full"
                >
                  Login
                </button>
                <button
                  onClick={() => { router.push("/account"); setMenuOpen(false); }}
                  className="flex-1 py-2 text-sm font-semibold text-[#445D41] border border-[#445D41] rounded-full"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* ── Scrollable Content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Category label */}
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shop by Category</p>
            </div>

            {/* Category List */}
            <nav>
              {mobileCategories.map((parent) => (
                <div key={parent.id} className="border-b border-gray-100">
                  {parent.subCategories && parent.subCategories.length > 0 ? (
                    <>
                      <button
                        onClick={() => toggleParent(parent.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-green-50 transition"
                      >
                        <span className="font-medium text-gray-800 text-sm">{parent.name}</span>
                        <ChevronDown
                          size={16}
                          className={`text-[#445D41] transition-transform duration-300 ${
                            openParents[parent.id] ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>

                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          openParents[parent.id] ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="bg-green-50/60 pl-6 pr-4 pb-2">
                          {parent.subCategories.map((sub) => (
                            <div key={sub.id}>
                              {sub.subCategories && sub.subCategories.length > 0 ? (
                                <>
                                  <button
                                    onClick={() => toggleChild(sub.id)}
                                    className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#445D41] transition"
                                  >
                                    <span>{sub.name}</span>
                                    <ChevronRight
                                      size={14}
                                      className={`transition-transform duration-300 ${
                                        openChildren[sub.id] ? "rotate-90" : "rotate-0"
                                      }`}
                                    />
                                  </button>
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ${
                                      openChildren[sub.id] ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                                    }`}
                                  >
                                    <div className="pl-3 border-l-2 border-green-200 ml-1 mb-1">
                                      {sub.subCategories.map((c) => (
                                        <Link
                                          key={c.id}
                                          href={`/category/${c.slug ?? "#"}`}
                                          onClick={() => setMenuOpen(false)}
                                          className="block py-1.5 text-xs text-gray-600 hover:text-[#445D41] transition"
                                        >
                                          {c.name}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <Link
                                  href={`/category/${sub.slug ?? "#"}`}
                                  onClick={() => setMenuOpen(false)}
                                  className="block py-2 text-sm text-gray-700 hover:text-[#445D41] transition"
                                >
                                  {sub.name}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link
                      href={`/category/${parent.slug ?? "#"}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#445D41] hover:bg-green-50 transition"
                    >
                      {parent.name}
                      <ChevronRight size={15} className="text-gray-400" />
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Quick Links */}
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Links</p>
            </div>
            <div className="pb-2">
              <Link
                href="/offers"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition border-b border-gray-100"
              >
                <BadgePercent size={18} />
                Offers &amp; Deals
              </Link>
              <Link
                href="/brands"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-[#445D41] transition border-b border-gray-100"
              >
                <Star size={18} />
                Shop by Brand
              </Link>
              <Link
                href="/cart"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-[#445D41] transition border-b border-gray-100"
              >
                <ShoppingCart size={18} />
                My Cart
                {isInitialized && cartCount > 0 && (
                  <span className="ml-auto bg-[#445D41] text-white text-xs rounded-full px-2 py-0.5">{cartCount}</span>
                )}
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-[#445D41] transition border-b border-gray-100"
              >
                <Heart size={18} />
                My Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{wishlistCount}</span>
                )}
              </Link>
             
            </div>
          </div>

          {/* ── Drawer Footer ── */}
          <div className="border-t bg-gray-50 px-4 py-3 flex-shrink-0">
            <div className="flex gap-3">
              <Link href="#"><Image src="/social/facebook.svg" alt="fb" width={26} height={26} /></Link>
              <Link href="#"><Image src="/social/instagram.svg" alt="ig" width={26} height={26} /></Link>
              <Link href="#"><Image src="/social/twitter.svg" alt="tw" width={26} height={26} /></Link>
              <Link href="#"><Image src="/social/youtube.svg" alt="yt" width={26} height={26} /></Link>
            </div>
          </div>
        </aside>
      </div>
    </header>
  );
}
