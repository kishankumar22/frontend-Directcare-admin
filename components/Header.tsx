"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, Heart, ShoppingCart, User, X, ChevronDown, ChevronRight, Truck, Package, Bike, Star, BadgePercent } from "lucide-react";
import MegaMenu from "./MegaMenu";
import { useToast } from "@/components/toast/CustomToast";
import { useCart } from "@/context/CartContext";
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
  const [searchValue, setSearchValue] = useState("");
 const [categories, setCategories] = useState<Category[]>(
  ssrCategories.filter((c: any) => c.showOnHomepage === true)
);

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [hovered, setHovered] = useState(false);
  const [hideTopBar, setHideTopBar] = useState(false);
  
  const lastScroll = useRef(0);
  const megaWrapperRef = useRef<HTMLDivElement>(null);

  const toast = useToast();
  const { cartCount, isInitialized } = useCart();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();


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
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (
      searchRef.current &&
      !searchRef.current.contains(e.target as Node)
    ) {
      setShowSearchDropdown(false);
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
          const topCategories = json.data
  .filter((cat: Category) => !cat.parentCategoryId)
  .filter((cat: any) => cat.showOnHomepage === true)
  .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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

  if (!searchValue.trim()) return;

  router.push(`/search?q=${encodeURIComponent(searchValue)}`);
  setShowSearchDropdown(false);
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
      className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out"
      style={{
        transform: hideTopBar ? 'translateY(-52px)' : 'translateY(0)',
        willChange: 'transform',
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
              <Image 
                src="/logo/logo.png" 
                alt="Direct Care Logo" 
                width={150} 
                height={50} 
                className="object-contain md:w-[240px] md:h-[80px]" 
                priority
              />
            </Link>
          </div>

          {/* Mobile Icons */}
          <div className="flex items-center gap-4 md:hidden">
            <button
              className="text-gray-700 hover:text-green-800 transition"
              onClick={() => toast.success("Thank you for liking this item!")}
            >
              <Heart size={22} />
            </button>
            <button
              className="relative text-gray-700 hover:text-green-800 transition"
              onClick={() => router.push("/cart")}
            >
              <ShoppingCart size={22} />
              {isInitialized && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#445D41] text-white text-[10px] rounded-full px-1.5">
                  {cartCount}
                </span>
              )}
            </button>
           {/* USER STATUS UI */}
{isAuthenticated && user ? (
  <button
    onClick={handleAccountClick}
    className="flex items-center gap-1 text-gray-700"
  >
    <User size={20} />
    <span className="text-xs font-medium">
      {user.firstName}
    </span>
  </button>
) : (
  <button
    onClick={() => router.push("/account")}
    className="px-3 py-1 text-xs font-semibold text-[#445D41] border border-[#445D41] rounded-md"
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
            <button
              className="hover:text-green-800 transition"
              onClick={() => toast.success("Thank you for liking this item!")}
            >
              <Heart size={22} />
            </button>
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

      {/* ✅ MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />

        <aside
          className={`absolute top-0 left-0 h-full w-[92vw] max-w-sm bg-white transform transition-transform duration-300 shadow-xl overflow-y-auto ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
              <Image src="/logo/logo.png" alt="logo" width={180} height={80} className="object-contain" />
            </Link>
            <button onClick={() => setMenuOpen(false)} className="text-gray-700">
              <X size={22} />
            </button>
          </div>

          <nav className="p-2">

            {categories.map((parent) => (
              <div key={parent.id} className="border-b">
                {parent.subCategories && parent.subCategories.length > 0 ? (
                  <>
                    <button
                      onClick={() => toggleParent(parent.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-800">{parent.name}</span>
                      <ChevronDown
                        size={18}
                        className={`text-gray-600 transition-transform duration-300 ease-in-out ${
                          openParents[parent.id] ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        openParents[parent.id] ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="pl-4 pr-4 pb-3 bg-gray-50">
                        {parent.subCategories.map((sub) => (
                          <div key={sub.id} className="mb-1">
                            {sub.subCategories && sub.subCategories.length > 0 ? (
                              <>
                                <button
                                  onClick={() => toggleChild(sub.id)}
                                  className="w-full flex items-center justify-between py-2 text-sm text-gray-700 hover:text-[#445D41] transition"
                                >
                                  <span>{sub.name}</span>
                                  <ChevronRight
                                    size={16}
                                    className={`transition-transform duration-300 ease-in-out ${
                                      openChildren[sub.id] ? "rotate-90" : "rotate-0"
                                    }`}
                                  />
                                </button>

                                <div
                                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    openChildren[sub.id] ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                                  }`}
                                >
                                  <div className="pl-3">
                                    {sub.subCategories.map((c) => (
                                      <Link
                                        key={c.id}
                                        href={`/category/${c.slug ?? "#"}`}
                                        onClick={() => setMenuOpen(false)}
                                        className="block py-1 text-sm text-gray-600 hover:text-[#445D41] transition"
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
                    className="flex items-center gap-2 px-4 py-3 font-medium text-gray-700 hover:text-[#445D41] hover:bg-gray-50 transition"
                  >
                    {parent.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t mt-4">
            <div className="mb-3">
              <Link href="/account" onClick={() => setMenuOpen(false)} className="block py-2 text-sm hover:text-[#445D41] transition">
                My Account
              </Link>
              <Link href="/orders" onClick={() => setMenuOpen(false)} className="block py-2 text-sm hover:text-[#445D41] transition">
                Orders
              </Link>
              <Link href="/cart" onClick={() => setMenuOpen(false)} className="block py-2 text-sm hover:text-[#445D41] transition">
                Cart
              </Link>
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
