// app/admin/layout.tsx
"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/app/admin/_component/CustomToast";
import { usePathname, useRouter } from "next/navigation";
import ChangePasswordModal from "@/app/admin/_component/ChangePasswordModal";

import {
  FolderKanban,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Store,
  Settings,
  LogOut,
  Bell,
  Search,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Tag,
  Image as ImageIcon,
  Percent,
  Layers,
  TrendingUp,
  UserCircle,
  Gift,
  Cog,
  FileText,
  MessageSquare,
  Moon,
  Sun,
  Star,
  PackageOpen,
  Receipt,
  Clock,
  LockKeyhole,
  User,
  Mail,
  DollarSign,
  MapPin,
  Ship,
  Truck,
  Activity, // ✅ NEW ICON FOR ACTIVITY LOGS
  Shield,
  Award,
  Coins,
  Sliders,
  ClipboardList, // ✅ NEW ICON FOR SYSTEM GROUP
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/admin/_context/theme-provider";
import { authService } from "@/lib/services/auth";
import ErrorBoundary from "@/app/admin/_component/ErrorBoundary";
import ScrollToTopButton from "./_component/ScrollToTopButton";

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
}


// ✅ UPDATED NAVIGATION WITH LOYALTY PROGRAM GROUP
const navigation: NavigationItem[] = [
  { 
    name: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard 
  },
  {
    name: 'Catalog',
    icon: Layers,
    children: [
      { name: 'Products', href: '/admin/products', icon: Package },
      { name: 'Categories', href: '/admin/categories', icon: FolderTree },
      { name: 'Brands', href: '/admin/brands', icon: Tag },
      { name: 'Product Reviews', href: '/admin/productReview', icon: Star },
      { name: 'Pharmacy Questions', href: '/admin/pharmacy-questions', icon: ClipboardList }, // ✅ NEW
    ],
  },
  {
    name: 'Sales',
    icon: TrendingUp,
    children: [
      { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    ],
  },
  {
    name: 'Customers',
    icon: UserCircle,
    children: [
      { name: 'Customers', href: '/admin/customers', icon: Users },
    ],
  },
  {
    name: 'Shipping Management',
    icon: Ship,
    children: [
      { name: 'Zones', href: '/admin/shipping/zones', icon: MapPin },
      { name: 'Methods', href: '/admin/shipping/methods', icon: Truck },
      { name: 'Rates', href: '/admin/shipping/rates', icon: DollarSign },
    ],
  },
  {
    name: 'Promotions',
    icon: Gift,
    children: [
      { name: 'Discounts', href: '/admin/discounts', icon: Percent },
      { name: 'Subscriptions', href: '/admin/subscriptions', icon: PackageOpen },
      { name: 'VAT Rates', href: '/admin/vatRates', icon: Receipt },
      { name: "NewsLetter", href: "/admin/newsletter", icon: Mail },
    ],
  },
  {
    name: 'Loyalty Program',
    icon: Award,
    children: [
      { 
        name: 'Loyalty Points',
        href: '/admin/loyalty-points', 
        icon: Coins
      },
      { 
        name: 'Loyalty Config',
        href: '/admin/loyalty-config', 
        icon: Sliders
      },
    ],
  },
  {
    name: 'Configuration',
    icon: Cog,
    children: [
      { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
    ],
  },
  {
    name: 'Content Management',
    icon: FileText,
    children: [
      { name: 'Blog Categories', href: '/admin/BlogCategories', icon: FolderKanban },
      { name: 'Blog Posts', href: '/admin/BlogPosts', icon: FileText },
      { name: 'Blog Comments', href: '/admin/comments', icon: MessageSquare },
    ],
  },
  {
    name: 'System',
    icon: Shield,
    children: [
      { name: 'Activity Logs', href: '/admin/ActivityLogs', icon: Activity },
    ],
  },
];



export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userInitial, setUserInitial] = useState<string>('A');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // ✅ NEW STATE FOR HOVER-BASED EXPANSION
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Token expiry countdown state
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);

  const isActiveRoute = (navHref: string, currentPath: string) => {
    if (navHref === '/admin' && currentPath === '/admin') return true;
    if (navHref !== '/admin' && currentPath.startsWith(navHref)) return true;
    return false;
  };

  const isParentActive = (children?: NavigationItem[]) => {
    if (!children) return false;
    return children.some(child => child.href && isActiveRoute(child.href, pathname));
  };

  // ✅ UPDATED: Handle click to toggle (for mobile and click behavior)
  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => {
      if (prev[menuName]) {
        return { [menuName]: false };
      }
      return { [menuName]: true };
    });
  };

  // ✅ NEW: Handle hover to auto-expand (desktop only)
  const handleMenuHover = (menuName: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMenu(menuName);
      // Close all other menus and open only the hovered one
      setExpandedMenus({ [menuName]: true });
    }, 200); // 200ms delay for smooth UX
  };

  const handleMenuLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredMenu(null);
  };

  const handleThemeToggle = () => {
    setIsAnimating(true);
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    if (newTheme === "dark") {
      toast.success("🌙 Dark Mode Enabled", {
        autoClose: 2000,
        position: "top-center"
      });
    } else {
      toast.success("☀️ Light Mode Enabled", {
        autoClose: 2000,
        position: "top-center"
      });
    }
    
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Token refresh check
  useEffect(() => {
    if (!authService.isAuthenticated()) return;

    const checkAndRefresh = async () => {
      if (authService.isTokenExpiringSoon(10)) {
        console.log("⚠️ Token expiring soon, refreshing...");
        
        const refreshed = await authService.refreshToken();
        
        if (refreshed) {
          toast.success("🔄 Session Extended -> Your session has been automatically renewed for 1 hour", {
            position: "top-center",
            autoClose: 5000,      
          });
          
          console.log("✅ Token refreshed successfully at", new Date().toLocaleTimeString());
        } else {
          toast.error("⏰ Session Expired -> Please login again to continue", {
            position: "top-center",
            autoClose: 5000,   
          });      
          router.replace("/login");
        }
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [router, toast]);

  // Calculate time remaining
  const calculateTimeRemaining = () => {
    const expiryDate = authService.getTokenExpiry();
    
    if (!expiryDate) {
      setTimeRemaining(null);
      return;
    }

    const now = new Date().getTime();
    const expiry = expiryDate.getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, total: 0 });
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeRemaining({ hours, minutes, seconds, total: diff });
  };

  // Auto-expand active parent menu
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children && isParentActive(item.children)) {
        setExpandedMenus({ [item.name]: true });
      }
    });
  }, [pathname]);

  // Load user data
  useEffect(() => {
    const email = localStorage.getItem('userEmail') || 'admin@ecom.com';
    const storedUserData = localStorage.getItem('userData');

    setUserEmail(email);

    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        let firstName = userData.firstName || '';
        let lastName = userData.lastName || '';

        if (!firstName || !lastName) {
          const token = localStorage.getItem('authToken');
          if (token) {
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const tokenData = JSON.parse(jsonPayload);
              firstName = firstName || tokenData.firstName || '';
              lastName = lastName || tokenData.lastName || '';
            } catch (err) {
              console.error('Token decode error:', err);
            }
          }
        }

        const fullName = `${firstName} ${lastName}`.trim() || 'Admin User';
        setUserName(fullName);
        setUserInitial(firstName ? firstName[0].toUpperCase() : email[0].toUpperCase());
      } catch (error) {
        setUserName('Admin User');
        setUserInitial(email[0].toUpperCase());
      }
    } else {
      setUserName('Admin User');
      setUserInitial(email[0].toUpperCase());
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    toast.success("Logged out successfully!", {
      position: "top-center",
      autoClose: 2000,
    });
  };

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const isSidebarExpanded = !sidebarCollapsed || (sidebarCollapsed && isHovering);
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';

  const getTimerColor = () => {
    if (!timeRemaining) return 'text-slate-400';
    const totalMinutes = timeRemaining.hours * 60 + timeRemaining.minutes;
    
    if (totalMinutes < 5) return 'text-red-400 animate-pulse';
    if (totalMinutes < 15) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 dark:bg-gray-950 relative overflow-hidden transition-colors duration-500">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] transition-all duration-500" />
        <div className="fixed top-0 -left-4 w-96 h-96 bg-violet-500 dark:bg-violet-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob transition-all duration-500" />
        <div className="fixed top-0 -right-4 w-96 h-96 bg-cyan-500 dark:bg-cyan-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob animation-delay-2000 transition-all duration-500" />
        <div className="fixed -bottom-8 left-1/2 w-96 h-96 bg-pink-500 dark:bg-pink-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob animation-delay-4000 transition-all duration-500" />

        <div className="relative z-990 flex h-screen overflow-hidden">
          {/* ✅ DESKTOP SIDEBAR WITH HOVER AUTO-EXPAND */}
          <aside
            onMouseEnter={() => sidebarCollapsed && setIsHovering(true)}
            onMouseLeave={() => {
              if (sidebarCollapsed) {
                setIsHovering(false);
                handleMenuLeave();
              }
            }}
            className={cn(
              "hidden lg:flex fixed h-full bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-800 dark:border-gray-800 flex-col transition-all duration-300 z-50",
              sidebarWidth,
              sidebarCollapsed && isHovering && "!w-64 shadow-2xl"
            )}
          >
            {/* Logo */}
            <div className="p-3 border-b border-slate-800 dark:border-gray-800 flex-shrink-0 h-[73px] flex items-center transition-colors duration-150">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 dark:from-violet-600 dark:via-purple-600 dark:to-cyan-600 flex items-center justify-center flex-shrink-0 transition-all duration-150 shadow-lg shadow-violet-500/50 dark:shadow-violet-500/30">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                {isSidebarExpanded && (
                  <div className="whitespace-nowrap">
                    <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">EcomPanel</h2>
                    <p className="text-xs text-slate-400 dark:text-gray-500 transition-colors duration-150">Admin Dashboard</p>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ NAVIGATION WITH HOVER AUTO-EXPAND */}
            <nav className="flex-1 p-1.5 space-y-1 overflow-y-auto custom-scrollbar">
              {navigation.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedMenus[item.name];
                const isParentItemActive = hasChildren && isParentActive(item.children);
                const isActive = item.href ? isActiveRoute(item.href, pathname) : false;
                const Icon = item.icon;

                if (hasChildren) {
                  return (
                    <div 
                      key={item.name} 
                      className="space-y-1"
                      onMouseEnter={() => isSidebarExpanded && handleMenuHover(item.name)}
                      onMouseLeave={() => isSidebarExpanded && handleMenuLeave()}
                    >
                      <button
                        onClick={() => isSidebarExpanded && toggleMenu(item.name)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                          isParentItemActive
                            ? "bg-slate-800/70 dark:bg-gray-800/80 text-white shadow-lg"
                            : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                        )}
                        title={!isSidebarExpanded ? item.name : ""}
                      >
                        <Icon className={cn(
                          "h-5 w-5 flex-shrink-0 transition-all duration-150 group-hover:scale-110",
                          isParentItemActive && "text-violet-400"
                        )} />
                        {isSidebarExpanded && (
                          <>
                            <span className="font-medium text-sm flex-1 text-left whitespace-nowrap">
                              {item.name}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-all duration-150",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </>
                        )}
                      </button>

                      {isSidebarExpanded && (
                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-300 ease-in-out",
                            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                          )}
                        >
                          <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-800 dark:border-gray-800 pl-2 transition-colors duration-150">
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              const isChildActive = child.href ? isActiveRoute(child.href, pathname) : false;

                              return (
                                <Link
                                  key={child.name}
                                  href={child.href || '#'}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative",
                                    isChildActive
                                      ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                                      : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                                  )}
                                >
                                  <ChildIcon className={cn(
                                    "h-4 w-4 flex-shrink-0 transition-all duration-150 group-hover:scale-110",
                                    isChildActive ? "text-white" : "text-cyan-400"
                                  )} />
                                  <span className="font-medium text-sm whitespace-nowrap">
                                    {child.name}
                                  </span>
                                  {isChildActive && (
                                    <ChevronRight className="h-3 w-3 ml-auto animate-pulse" />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href || '#'}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                      isActive
                        ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                        : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                    )}
                    title={!isSidebarExpanded ? item.name : ""}
                  >
                    <Icon className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-150 group-hover:scale-110",
                      isActive ? "text-white" : "text-violet-400"
                    )} />
                    {isSidebarExpanded && (
                      <>
                        <span className="font-medium text-sm flex-1 whitespace-nowrap">
                          {item.name}
                        </span>
                        {isActive && <ChevronRight className="h-4 w-4 animate-pulse" />}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Links */}
            <div className="p-2 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 space-y-1 transition-colors duration-150">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-150 group"
                title={!isSidebarExpanded ? "View Store" : ""}
              >
                <Store className="h-5 w-5 flex-shrink-0 text-cyan-400 group-hover:scale-110 transition-transform" />
                {isSidebarExpanded && (
                  <span className="font-medium text-sm whitespace-nowrap">View Store</span>
                )}
              </Link>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-150 group"
                title={!isSidebarExpanded ? "Settings" : ""}
              >
                <Settings className="h-5 w-5 flex-shrink-0 text-violet-400 group-hover:scale-110 transition-transform group-hover:rotate-90" />
                {isSidebarExpanded && (
                  <span className="font-medium text-sm whitespace-nowrap">Settings</span>
                )}
              </button>
            </div>

            {/* User Profile - Expanded */}
            {isSidebarExpanded && (
              <div className="p-3 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-150">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 dark:bg-gray-800/70 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-all duration-150 shadow-lg dark:shadow-violet-500/30">
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate transition-colors duration-150">{userName}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500 truncate transition-colors duration-150">{userEmail}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 transition-colors duration-150"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* User Profile - Collapsed */}
            {!isSidebarExpanded && (
              <div className="p-2 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-150">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-150 shadow-lg dark:shadow-violet-500/30">
                    {userInitial}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-150"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </aside>

        
        {/* Mobile Sidebar */}
        <aside
          className={cn(
            "fixed lg:hidden h-full w-64 bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-800 dark:border-gray-800 flex flex-col transition-all duration-300 z-50",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-3 border-b border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 dark:from-violet-600 dark:via-purple-600 dark:to-cyan-600 flex items-center justify-center transition-all duration-150 shadow-lg shadow-violet-500/50 dark:shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">EcomPanel</h2>
                <p className="text-xs text-slate-400 dark:text-gray-500 transition-colors duration-150">Admin Dashboard</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.name];
              const isParentItemActive = hasChildren && isParentActive(item.children);
              const isActive = item.href ? isActiveRoute(item.href, pathname) : false;
              const Icon = item.icon;

              if (hasChildren) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 group",
                        isParentItemActive
                          ? "bg-slate-800/70 dark:bg-gray-800/80 text-white shadow-lg"
                          : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-all duration-150 group-hover:scale-110",
                        isParentItemActive && "text-violet-400"
                      )} />
                      <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-all duration-150",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-800 dark:border-gray-800 pl-3 transition-colors duration-150">
                        {item.children?.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = child.href ? isActiveRoute(child.href, pathname) : false;

                          return (
                            <Link
                              key={child.name}
                              href={child.href || '#'}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                                isChildActive
                                  ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                                  : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                              )}
                            >
                              <ChildIcon className={cn(
                                "h-4 w-4 transition-all duration-150 group-hover:scale-110",
                                isChildActive ? "text-white" : "text-cyan-400"
                              )} />
                              <span className="font-medium text-sm">{child.name}</span>
                              {isChildActive && <ChevronRight className="h-3 w-3 ml-auto animate-pulse" />}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href || '#'}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 group",
                    isActive
                      ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                      : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-150 group-hover:scale-110",
                    isActive ? "text-white" : "text-violet-400"
                  )} />
                  <span className="font-medium text-sm flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="h-4 w-4 animate-pulse" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 space-y-1.5 transition-colors duration-150">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-150 group"
            >
              <Store className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-sm">View Store</span>
            </Link>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-150 group">
              <Settings className="h-5 w-5 text-violet-400 group-hover:scale-110 transition-transform group-hover:rotate-90" />
              <span className="font-medium text-sm">Settings</span>
            </button>
          </div>

          <div className="p-4 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-150">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 dark:bg-gray-800/70 transition-colors duration-150">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-150 shadow-lg dark:shadow-violet-500/30">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate transition-colors duration-150">{userName}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 truncate transition-colors duration-150">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 transition-colors duration-150"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm lg:hidden z-40 transition-all duration-150"
            onClick={() => setSidebarOpen(false)}
          />
        )}


          {/* Main Content */}
          <div 
            className={cn(
              "flex-1 flex flex-col overflow-hidden transition-all duration-300",
              sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
            )}
          >
          <header className="flex-shrink-0 bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-b border-slate-800 dark:border-gray-800 z-30 transition-colors duration-150">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-150"
                  >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>

                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:block p-2 text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-150"
                    title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <div className="flex-1 max-w-xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-gray-600 transition-colors duration-150" />
                      <input
                        type="search"
                        placeholder="Search products, orders, customers..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 dark:bg-gray-800/70 border border-slate-700 dark:border-gray-700 rounded-lg text-sm text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-600 transition-all duration-150"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {timeRemaining && (
                    <div 
                      className={cn(
                        "hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150",
                        "bg-slate-800/50 dark:bg-gray-800/70 border border-slate-700 dark:border-gray-700",
                        timeRemaining.total < 5 * 60 * 1000 && "border-red-500/50 bg-red-500/10 animate-pulse"
                      )}
                      title="Session expires in"
                    >
                      <Clock className={cn("h-4 w-4", getTimerColor())} />
                      <span className={cn("text-xs font-mono font-semibold", getTimerColor())}>
                        {String(timeRemaining.hours).padStart(2, '0')}:
                        {String(timeRemaining.minutes).padStart(2, '0')}:
                        {String(timeRemaining.seconds).padStart(2, '0')}
                      </span>
                    </div>
                  )}
<button
  onClick={() => {
    toast.success("No Notificaton Right Now");
  }}
  className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-150"
>
  <Bell className="h-5 w-5" />
</button>


                  <button
                    onClick={handleThemeToggle}
                    className={cn(
                      "relative p-2 rounded-lg transition-all duration-150 group",
                      "bg-slate-800/50 dark:bg-gray-800/70 hover:bg-slate-800 dark:hover:bg-gray-800",
                      "text-slate-400 dark:text-gray-400 hover:text-white",
                      isAnimating && "scale-110 rotate-180"
                    )}
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    <div className="relative w-5 h-5">
                      <Sun 
                        className={cn(
                          "absolute inset-0 h-5 w-5 transition-all duration-500 text-yellow-500",
                          theme === "dark" 
                            ? "rotate-90 scale-0 opacity-0" 
                            : "rotate-0 scale-100 opacity-100"
                        )} 
                      />
                      <Moon 
                        className={cn(
                          "absolute inset-0 h-5 w-5 transition-all duration-500 text-blue-400",
                          theme === "dark" 
                            ? "rotate-0 scale-100 opacity-100" 
                            : "-rotate-90 scale-0 opacity-0"
                        )} 
                      />
                    </div>
                    
                    {isAnimating && (
                      <span className="absolute inset-0 rounded-lg bg-violet-500/30 dark:bg-violet-600/40 animate-ping" />
                    )}
                  </button>

                  {/* Profile Dropdown */}
                  <div className="hidden lg:block relative" ref={dropdownRef}>
                    <button
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2.5 pl-3 ml-3 border-l border-slate-800 dark:border-gray-800 transition-colors duration-150 hover:opacity-80"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-150 shadow-lg dark:shadow-violet-500/30">
                        {userInitial}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white leading-tight transition-colors duration-150">{userName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full transition-colors duration-150"></div>
                          <p className="text-xs text-slate-400 dark:text-gray-500 transition-colors duration-150">Online</p>
                        </div>
                      </div>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform duration-200",
                          profileDropdownOpen && "rotate-180"
                        )} 
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-slate-900 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                        <div className="p-3 border-b border-slate-800 dark:border-gray-800">
                          <p className="text-sm font-semibold text-white">{userName}</p>
                          <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{userEmail}</p>
                        </div>

                        <div className="p-2">
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              setChangePwdOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 dark:hover:bg-gray-800/70 transition-all duration-150 group"
                          >
                            <LockKeyhole className="h-4 w-4 text-violet-400 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Change Password</span>
                          </button>

                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-red-400 dark:hover:text-red-500 hover:bg-red-500/10 transition-all duration-150 group mt-1"
                          >
                            <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar transition-colors duration-500">
              <div className="transition-all duration-150">
                {children}
                <ScrollToTopButton />
              </div>
            </main>
          </div>
        </div>

        <ChangePasswordModal
          open={changePwdOpen}
          onClose={() => setChangePwdOpen(false)}
        />

        <style jsx global>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { 
            background: rgba(148, 163, 184, 0.3); 
            border-radius: 3px; 
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
            background: rgba(148, 163, 184, 0.5); 
          }
          
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { 
            background: rgba(107, 114, 128, 0.4); 
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
            background: rgba(107, 114, 128, 0.6); 
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
