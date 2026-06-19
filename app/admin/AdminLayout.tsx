// app/admin/layout.tsx
"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/app/admin/_components/CustomToast";
import { usePathname, useRouter } from "next/navigation";
import ChangePasswordModal from "@/app/admin/_components/ChangePasswordModal";

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
  Info,
  MapPin,
  Ship,
  Truck,
  Activity,
  Shield,
  Award,
  Coins,
  Sliders,
  ClipboardList,
  PoundSterling,
  Warehouse,
  ShieldCheck,
  FileSpreadsheet,
  Monitor,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/admin/_context/theme-provider";
import { authService } from "@/lib/services/auth";
import ErrorBoundary from "@/app/admin/_components/ErrorBoundary";
import ScrollToTopButton from "./_components/ScrollToTopButton";
import { useAdminLogoutShortcut } from "./_hooks/useAdminLogoutShortcut";
import { useAuth } from "./_context/auth-context";

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
}

// Navigation with clean group organization
const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    name: 'Catalog',
    icon: Layers,
    children: [
      { name: 'Products', href: '/admin/products', icon: Package },
      { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
      { name: 'Categories', href: '/admin/categories', icon: FolderTree },
      { name: 'Brands', href: '/admin/brands', icon: Tag },
      { name: 'Product Reviews', href: '/admin/productReview', icon: Star },
      { name: 'Pharmacy Q&A', href: '/admin/pharmacy-questions', icon: ClipboardList },
      { name: 'Pharma Review', href: '/admin/pharma-review', icon: ShieldCheck },
    ],
  },
  {
    name: 'Sales',
    icon: TrendingUp,
    children: [
      { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { name: 'Payments', href: '/admin/payments', icon: CreditCard },
      { name: 'Customers', href: '/admin/customers', icon: Users },
    ],
  },
  {
    name: 'Marketing',
    icon: Gift,
    children: [
      { name: 'Discounts', href: '/admin/discounts', icon: Percent },
      { name: 'Subscriptions', href: '/admin/subscriptions', icon: PackageOpen },
      { name: 'Newsletter', href: '/admin/newsletter', icon: Mail },
      { name: 'Loyalty Points', href: '/admin/loyalty-points', icon: Coins },
      { name: 'Loyalty Config', href: '/admin/loyalty-config', icon: Sliders },
    ],
  },
  {
    name: 'Shipping',
    icon: Truck,
    children: [
      { name: 'Shipping Settings', href: '/admin/shipping', icon: Settings },
      { name: 'Delivery Strips', href: '/admin/DeliveryStrip', icon: PackageOpen },
    ],
  },
  {
    name: 'Finance',
    icon: Receipt,
    children: [
      { name: 'VAT Rates', href: '/admin/vatRates', icon: PoundSterling },
    ],
  },
  { name: 'Import / Export', href: '/admin/import-export', icon: FileSpreadsheet },
  {
    name: 'Content',
    icon: FileText,
    children: [
      { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
      { name: 'Homepage Preview', href: '/admin/HomepagePreview', icon: Monitor },
      { name: 'Blog Categories', href: '/admin/BlogCategories', icon: FolderKanban },
      { name: 'Blog Posts', href: '/admin/BlogPosts', icon: FileText },
      { name: 'Blog Comments', href: '/admin/comments', icon: MessageSquare },
      { name: 'Contacts', href: '/admin/contact', icon: Mail },
    ],
  },
  {
    name: 'Staff Management',
    icon: Users,
    children: [
      { name: 'Staff', href: '/admin/staff', icon: User },
      { name: 'Staff Roles', href: '/admin/staff-roles', icon: ShieldCheck },
    ],
  },
  {
    name: 'System',
    icon: Shield,
    children: [
      { name: 'Activity Logs', href: '/admin/ActivityLogs', icon: Activity },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [isAnimating, setIsAnimating] = useState(false);

  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useAdminLogoutShortcut();

  const [ukTime, setUkTime] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const timeStr = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setUkTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isActiveRoute = (navHref: string, currentPath: string) => {
    if (navHref === '/admin') return currentPath === '/admin';
    return (
      currentPath === navHref ||
      currentPath.startsWith(navHref + '/')
    );
  };

  const isParentActive = (children?: NavigationItem[]) => {
    if (!children) return false;
    return children.some(child => child.href && isActiveRoute(child.href, pathname));
  };

  const getGroupColor = (name: string) => {
    const isLight = theme === "light";
    const map: Record<string, { icon: string; border: string; bg: string; dot: string }> = {
      Catalog: {
        icon: isLight ? 'text-[#445D41]' : 'text-cyan-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-cyan-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-cyan-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-cyan-400'
      },
      Sales: {
        icon: isLight ? 'text-[#445D41]' : 'text-emerald-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-emerald-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-emerald-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-emerald-400'
      },
      Marketing: {
        icon: isLight ? 'text-[#445D41]' : 'text-pink-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-pink-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-pink-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-pink-400'
      },
      Shipping: {
        icon: isLight ? 'text-[#445D41]' : 'text-blue-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-blue-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-blue-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-blue-400'
      },
      Finance: {
        icon: isLight ? 'text-[#445D41]' : 'text-yellow-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-yellow-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-yellow-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-yellow-400'
      },
      Content: {
        icon: isLight ? 'text-[#445D41]' : 'text-amber-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-amber-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-amber-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-amber-400'
      },
      System: {
        icon: isLight ? 'text-[#445D41]' : 'text-slate-400',
        border: isLight ? 'border-[#445D41]/50' : 'border-slate-500/50',
        bg: isLight ? 'bg-[#445D41]/10' : 'bg-slate-500/10',
        dot: isLight ? 'bg-[#445D41]' : 'bg-slate-400'
      },
    };
    return map[name] ?? {
      icon: isLight ? 'text-[#445D41]' : 'text-violet-400',
      border: isLight ? 'border-[#445D41]/50' : 'border-violet-500/50',
      bg: isLight ? 'bg-[#445D41]/10' : 'bg-violet-500/10',
      dot: isLight ? 'bg-[#445D41]' : 'bg-violet-400'
    };
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => {
      if (prev[menuName]) {
        return { [menuName]: false };
      }
      return { [menuName]: true };
    });
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

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [router, toast, isAuthenticated]);

  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children && isParentActive(item.children)) {
        setExpandedMenus({ [item.name]: true });
      }
    });
  }, [pathname]);

  const userEmail = user?.email || 'admin@ecom.com';
  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user?.firstName || user?.lastName || 'Admin User';
  const userInitial = user?.firstName
    ? user.firstName[0].toUpperCase()
    : userEmail[0].toUpperCase();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!", {
      position: "top-center",
      autoClose: 1000,
    });
  };

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const isSidebarExpanded = !sidebarCollapsed || (sidebarCollapsed && isHovering);
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';

  // Light mode styles
  const isLight = theme === "light";

  return (
    <ErrorBoundary>
      <div data-admin className={cn(
        "min-h-screen relative overflow-hidden transition-colors duration-500",
        isLight ? "bg-gray-50" : "bg-slate-100 dark:bg-slate-950"
      )}>
        {/* Background Effects - Light Mode */}
        {isLight ? (
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#e8f0e6_1px,transparent_1px),linear-gradient(to_bottom,#e8f0e6_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] transition-all duration-500" />
        ) : (
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] transition-all duration-500" />
        )}
        <div className="fixed top-0 -left-4 w-96 h-96 bg-violet-500 dark:bg-violet-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob transition-all duration-500" />
        <div className="fixed top-0 -right-4 w-96 h-96 bg-cyan-500 dark:bg-cyan-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob animation-delay-2000 transition-all duration-500" />
        <div className="fixed -bottom-8 left-1/2 w-96 h-96 bg-pink-500 dark:bg-pink-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob animation-delay-4000 transition-all duration-500" />

        <div className="relative z-990 flex h-screen overflow-hidden">
          {/* ✅ DESKTOP SIDEBAR WITH LIGHT MODE COLORS */}
          <aside
            onMouseEnter={() => sidebarCollapsed && setIsHovering(true)}
            onMouseLeave={() => {
              if (sidebarCollapsed) {
                setIsHovering(false);
                handleMenuLeave();
              }
            }}
            className={cn(
              "hidden lg:flex fixed h-full flex-col transition-all duration-300 z-50",
              sidebarWidth,
              sidebarCollapsed && isHovering && "!w-64 shadow-2xl",
              isLight
                ? "bg-white/95 backdrop-blur-xl border-r border-[#445D41]/20"
                : "bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-800 dark:border-gray-800"
            )}
          >
            {/* Logo */}
            <div
              className={cn(
                "border-b flex-shrink-0 transition-all duration-150",
                isLight ? "border-[#445D41]/10" : "border-slate-800/60",
                isSidebarExpanded
                  ? "px-3 py-2 flex flex-col items-start"
                  : "h-[60px] flex items-center justify-center"
              )}
            >
              {isSidebarExpanded ? (
                <div className="w-full">
                  <div className="px-2 py-1 bg-white rounded-xl shadow-md border border-slate-200 inline-block">
                    <img
                      src="/logo/logo.png"
                      alt="Direct Care"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <p className={cn(
                    "pl-1 text-[11px] font-semibold tracking-[0.28em] uppercase drop-shadow-sm",
                    isLight
                      ? "text-[#445D41]"
                      : "bg-gradient-to-r from-violet-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
                  )}>
                    Admin Dashboard
                  </p>
                </div>
              ) : (
                <div className="w-8 h-9 rounded-md bg-white p-0.5 flex items-center justify-center shadow-lg border border-slate-200 overflow-hidden">
                  <img
                    src="/logo/logo.png"
                    alt="DC"
                    className="h-7 w-auto object-cover object-left"
                  />
                </div>
              )}
            </div>

            {/* NAVIGATION */}
            <nav className={cn("flex-1 space-y-0.5 overflow-y-auto custom-scrollbar py-2", isSidebarExpanded ? "px-1.5" : "px-1")}>
              {navigation.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedMenus[item.name];
                const isParentItemActive = hasChildren && isParentActive(item.children);
                const isActive = item.href ? isActiveRoute(item.href, pathname) : false;
                const Icon = item.icon;
                const gc = getGroupColor(item.name);

                if (hasChildren) {
                  return (
                    <div key={item.name} className="space-y-0.5">
                      <button
                        onClick={() => isSidebarExpanded && toggleMenu(item.name)}
                        className={cn(
                          "w-full flex items-center gap-2.5 py-1.5 rounded-lg transition-all duration-150 group relative",
                          isSidebarExpanded ? "px-2" : "px-0 justify-center",
                          isParentItemActive && isSidebarExpanded
                            ? isLight
                              ? `${gc.bg} text-[#445D41]`
                              : `${gc.bg} text-white`
                            : isLight
                              ? "text-gray-500 hover:text-[#445D41]"
                              : "text-slate-400 hover:text-white",
                          !isParentItemActive && isSidebarExpanded && (isLight ? "hover:bg-[#445D41]/5" : "hover:bg-slate-800/50")
                        )}
                        title={!isSidebarExpanded ? item.name : ""}
                      >
                        <div className={cn(
                          "rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150",
                          isSidebarExpanded ? "w-7 h-7" : "w-9 h-9",
                          isParentItemActive
                            ? `${gc.bg} ${gc.icon} shadow-sm`
                            : isLight
                              ? "bg-gray-100 text-gray-400 group-hover:bg-[#445D41]/10 group-hover:text-[#445D41]"
                              : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {isSidebarExpanded && (
                          <>
                            <span className={cn(
                              "font-semibold text-xs flex-1 text-left whitespace-nowrap tracking-wide uppercase",
                              isLight ? "text-gray-700" : "text-white"
                            )}>
                              {item.name}
                            </span>
                            {isParentItemActive && (
                              <div className={cn("w-1.5 h-1.5 rounded-full mr-1", gc.dot)} />
                            )}
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-200", isLight ? "text-gray-400" : "text-slate-500", isExpanded && "rotate-180")} />
                          </>
                        )}
                      </button>

                      {isSidebarExpanded && (
                        <div className={cn("overflow-hidden transition-all duration-200 ease-in-out", isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0")}>
                          <div className={cn("ml-3 mt-0.5 space-y-0.5 border-l-2 pl-2 pb-1", gc.border)}>
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;
                              const isChildActive = child.href ? isActiveRoute(child.href, pathname) : false;
                              return (
                                <Link
                                  key={child.name}
                                  href={child.href || '#'}
                                  className={cn(
                                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 group",
                                    isChildActive
                                      ? isLight
                                        ? "bg-[#445D41] text-white shadow-md"
                                        : "bg-gradient-to-r from-violet-500/90 to-cyan-500/90 text-white shadow-md"
                                      : isLight
                                        ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                  )}
                                >
                                  <ChildIcon className={cn("h-3.5 w-3.5 flex-shrink-0 transition-colors", isChildActive ? "text-white" : gc.icon)} />
                                  <span className="text-xs font-medium whitespace-nowrap">{child.name}</span>
                                  {isChildActive && <div className={cn("ml-auto w-1 h-4 rounded-full", isLight ? "bg-white/60" : "bg-white/60")} />}
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
                      "flex items-center gap-2.5 py-1.5 rounded-lg transition-all duration-150 group",
                      isSidebarExpanded ? "px-2" : "px-0 justify-center",
                      isActive && isSidebarExpanded
                        ? isLight
                          ? "bg-[#445D41] text-white shadow-lg shadow-[#445D41]/30"
                          : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30"
                        : isLight
                          ? "text-gray-500 hover:text-[#445D41]"
                          : "text-slate-400 hover:text-white",
                      !isActive && isSidebarExpanded && (isLight ? "hover:bg-[#445D41]/5" : "hover:bg-slate-800/50")
                    )}
                    title={!isSidebarExpanded ? item.name : ""}
                  >
                    <div className={cn(
                      "rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                      isSidebarExpanded ? "w-7 h-7" : "w-9 h-9",
                      isActive
                        ? isLight
                          ? "bg-[#445D41]/20 text-[#445D41]"
                          : "bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-md"
                        : isLight
                          ? "bg-gray-100 text-[#445D41] group-hover:bg-[#445D41]/10"
                          : "bg-slate-800/80 text-violet-400 group-hover:bg-slate-700 group-hover:text-white"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSidebarExpanded && (
                      <>
                        <span className={cn(
                          "font-semibold text-xs flex-1 whitespace-nowrap tracking-wide uppercase",
                          isLight ? "text-gray-700" : "text-white"
                        )}>
                          {item.name}
                        </span>
                        {isActive && <ChevronRight className="h-3.5 w-3.5 animate-pulse" />}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Links */}
            <div className={cn("p-2 border-t flex-shrink-0 space-y-0.5", isLight ? "border-[#445D41]/10" : "border-slate-800/60")}>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSidebarOpen(false);
                  window.open("/", "_blank");
                }}
                title="open store in new tab"
                className={cn(
                  "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group",
                  isLight
                    ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <div className={cn(
                  "rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  isSidebarExpanded ? "w-7 h-7" : "w-9 h-9",
                  isLight
                    ? "bg-gray-100 text-[#445D41] group-hover:bg-[#445D41]/10"
                    : "bg-slate-800/80 text-cyan-400 group-hover:bg-slate-700"
                )}>
                  <Store className="h-4 w-4" />
                </div>
                {isSidebarExpanded && (
                  <span className={cn("text-xs font-medium whitespace-nowrap", isLight ? "text-gray-600" : "text-white")}>
                    View Store
                  </span>
                )}
              </a>
            </div>

            {/* User Profile - Expanded */}
            {isSidebarExpanded && (
              <div className={cn("p-3 border-t flex-shrink-0 transition-colors duration-150", isLight ? "border-[#445D41]/10" : "border-slate-800 dark:border-gray-800")}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                  isLight
                    ? "bg-[#445D41]/5"
                    : "bg-slate-800/50 dark:bg-gray-800/70"
                )}>
                  <div className="w-9 h-9 rounded-full bg-[#445D41] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-all duration-150 shadow-lg shadow-[#445D41]/30">
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-semibold truncate transition-colors duration-150",
                      isLight ? "text-gray-800" : "text-slate-800 dark:text-white"
                    )}>
                      {userName}
                    </p>
                    <p className={cn(
                      "text-xs truncate transition-colors duration-150",
                      isLight ? "text-gray-500" : "text-slate-500 dark:text-gray-500"
                    )}>
                      {userEmail}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "transition-colors duration-150",
                      isLight
                        ? "text-gray-400 hover:text-red-500"
                        : "text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500"
                    )}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* User Profile - Collapsed */}
            {!isSidebarExpanded && (
              <div className={cn("p-2 border-t flex-shrink-0 transition-colors duration-150", isLight ? "border-[#445D41]/10" : "border-slate-800 dark:border-gray-800")}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#445D41] flex items-center justify-center text-white font-bold text-sm transition-all duration-150 shadow-lg shadow-[#445D41]/30">
                    {userInitial}
                  </div>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-lg transition-all duration-150",
                      isLight
                        ? "text-gray-400 hover:text-red-500 hover:bg-[#445D41]/5"
                        : "text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                    )}
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
              "fixed lg:hidden h-full w-64 flex flex-col transition-all duration-300 z-50",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
              isLight
                ? "bg-white/95 backdrop-blur-xl border-r border-[#445D41]/20"
                : "bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-800 dark:border-gray-800"
            )}
          >
            <div className={cn("p-3 border-b flex-shrink-0 transition-colors duration-150", isLight ? "border-[#445D41]/10" : "border-slate-800 dark:border-gray-800")}>
              <div className="flex flex-col items-start">
                <div className="px-2 py-1 bg-white rounded-xl shadow-md border border-slate-200">
                  <img
                    src="/logo/logo.png"
                    alt="Direct Care"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <p className={cn(
                  "mt-2 pl-1 text-[11px] font-semibold tracking-[0.28em] uppercase drop-shadow-sm",
                  isLight
                    ? "text-[#445D41]"
                    : "bg-gradient-to-r from-violet-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
                )}>
                  Admin Dashboard
                </p>
              </div>
            </div>

            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto custom-scrollbar">
              {navigation.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedMenus[item.name];
                const isParentItemActive = hasChildren && isParentActive(item.children);
                const isActive = item.href ? isActiveRoute(item.href, pathname) : false;
                const Icon = item.icon;
                const gc = getGroupColor(item.name);

                if (hasChildren) {
                  return (
                    <div key={item.name} className="space-y-0.5">
                      <button
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group",
                          isParentItemActive
                            ? isLight
                              ? `${gc.bg} text-[#445D41]`
                              : `${gc.bg} text-white`
                            : isLight
                              ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                          isParentItemActive
                            ? isLight
                              ? `${gc.bg} ${gc.icon}`
                              : `${gc.bg} ${gc.icon}`
                            : isLight
                              ? "bg-gray-100 text-[#445D41]"
                              : "bg-slate-800/70 text-slate-400"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={cn(
                          "font-semibold text-xs flex-1 text-left tracking-wide uppercase",
                          isLight ? "text-gray-700" : "text-white"
                        )}>
                          {item.name}
                        </span>
                        {isParentItemActive && <div className={cn("w-1.5 h-1.5 rounded-full", gc.dot)} />}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-200", isLight ? "text-gray-400" : "text-slate-500", isExpanded && "rotate-180")} />
                      </button>

                      <div className={cn("overflow-hidden transition-all duration-200 ease-in-out", isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0")}>
                        <div className={cn("ml-3 mt-0.5 space-y-0.5 border-l-2 pl-2 pb-1", gc.border)}>
                          {item.children?.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive = child.href ? isActiveRoute(child.href, pathname) : false;
                            return (
                              <Link
                                key={child.name}
                                href={child.href || '#'}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 group",
                                  isChildActive
                                    ? isLight
                                      ? "bg-[#445D41] text-white shadow-md"
                                      : "bg-gradient-to-r from-violet-500/90 to-cyan-500/90 text-white shadow-md"
                                    : isLight
                                      ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                                )}
                              >
                                <ChildIcon className={cn("h-3.5 w-3.5 flex-shrink-0", isChildActive ? "text-white" : gc.icon)} />
                                <span className="text-xs font-medium">{child.name}</span>
                                {isChildActive && <div className="ml-auto w-1 h-4 rounded-full bg-white/60" />}
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
                      "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group",
                      isActive
                        ? isLight
                          ? "bg-[#445D41] text-white shadow-lg"
                          : "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg"
                        : isLight
                          ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                      isActive
                        ? isLight
                          ? "bg-white/20 text-white"
                          : "bg-white/20 text-white"
                        : isLight
                          ? "bg-gray-100 text-[#445D41]"
                          : "bg-slate-800/70 text-violet-400"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn(
                      "font-semibold text-xs flex-1 tracking-wide uppercase",
                      isLight ? "text-gray-700" : "text-white"
                    )}>
                      {item.name}
                    </span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 animate-pulse" />}
                  </Link>
                );
              })}
            </nav>

            <div className={cn("p-2 border-t flex-shrink-0 space-y-0.5", isLight ? "border-[#445D41]/10" : "border-slate-800/60")}>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setSidebarOpen(false);
                  window.open("/", "_blank");
                }}
                title="open store in new tab"
                className={cn(
                  "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-150 group",
                  isLight
                    ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                  isLight
                    ? "bg-gray-100 text-[#445D41]"
                    : "bg-slate-800/70 text-cyan-400"
                )}>
                  <Store className="h-4 w-4" />
                </div>
                <span className={cn("text-xs font-medium", isLight ? "text-gray-600" : "text-white")}>
                  View Store
                </span>
              </a>
            </div>

            <div className={cn("p-4 border-t flex-shrink-0 transition-colors duration-150", isLight ? "border-[#445D41]/10" : "border-slate-800 dark:border-gray-800")}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                isLight
                  ? "bg-[#445D41]/5"
                  : "bg-slate-800/50 dark:bg-gray-800/70"
              )}>
                <div className="w-9 h-9 rounded-full bg-[#445D41] flex items-center justify-center text-white font-bold text-sm transition-all duration-150 shadow-lg shadow-[#445D41]/30">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold truncate transition-colors duration-150",
                    isLight ? "text-gray-800" : "text-white"
                  )}>
                    {userName}
                  </p>
                  <p className={cn(
                    "text-xs truncate transition-colors duration-150",
                    isLight ? "text-gray-500" : "text-slate-400 dark:text-gray-500"
                  )}>
                    {userEmail}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className={cn(
                    "transition-colors duration-150",
                    isLight
                      ? "text-gray-400 hover:text-red-500"
                      : "text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500"
                  )}
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
              className={cn(
                "fixed inset-0 backdrop-blur-sm lg:hidden z-40 transition-all duration-150",
                isLight ? "bg-black/30" : "bg-black/50 dark:bg-black/70"
              )}
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
            <header className={cn(
              "flex-shrink-0 backdrop-blur-xl border-b z-30 transition-colors duration-150",
              isLight
                ? "bg-white/80 border-[#445D41]/10"
                : "bg-slate-900/80 dark:bg-gray-900/90 border-slate-800 dark:border-gray-800"
            )}>
              <div className="px-6 py-4">
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className={cn(
                        "lg:hidden p-2 rounded-lg transition-all duration-150",
                        isLight
                          ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                          : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70"
                      )}
                    >
                      {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    <button
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className={cn(
                        "hidden lg:block p-2 rounded-lg transition-all duration-150",
                        isLight
                          ? "text-gray-500 hover:text-[#445D41] hover:bg-[#445D41]/5"
                          : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70"
                      )}
                      title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                      <Menu className="h-5 w-5" />
                    </button>

                    <div className="flex absolute left-1/2 -translate-x-1/2 z-10 items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200/80 dark:bg-red-950/30 dark:hover:bg-red-900/40 border border-red-300 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-[10px] md:text-xs font-semibold shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-help max-w-[70%] sm:max-w-none justify-center sm:pl-4">
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="sm:whitespace-nowrap whitespace-normal text-center leading-normal">Your changes have been saved. Website updates may take up to 1 minute to reflect.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {ukTime && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-150 select-none",
                        isLight
                          ? "bg-[#445D41]/5 hover:bg-[#445D41]/10 border border-[#445D41]/10 text-gray-600"
                          : "bg-slate-800/50 hover:bg-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 border border-slate-700 dark:border-slate-700 text-slate-300 dark:text-slate-200"
                      )}
                        title="Current UK Time">
                        <Clock className={cn("h-3.5 w-3.5", isLight ? "text-[#445D41]" : "text-slate-400 dark:text-slate-400")} />
                        <span className="font-mono">{ukTime}</span>
                      </div>
                    )}
                    <button
                      onClick={handleThemeToggle}
                      className={cn(
                        "relative p-2 rounded-lg transition-all duration-150 group",
                        isLight
                          ? "bg-[#445D41]/5 hover:bg-[#445D41]/10 text-gray-500 hover:text-[#445D41]"
                          : "bg-slate-800/50 dark:bg-gray-800/70 hover:bg-slate-800 dark:hover:bg-gray-800 text-slate-400 dark:text-gray-400 hover:text-white",
                        isAnimating && "scale-110 rotate-180"
                      )}
                      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                      <div className="relative w-5 h-5">
                        <Sun
                          className={cn(
                            "absolute inset-0 h-5 w-5 transition-all duration-500",
                            theme === "dark"
                              ? "rotate-90 scale-0 opacity-0"
                              : "rotate-0 scale-100 opacity-100 text-yellow-500"
                          )}
                        />
                        <Moon
                          className={cn(
                            "absolute inset-0 h-5 w-5 transition-all duration-500",
                            theme === "dark"
                              ? "rotate-0 scale-100 opacity-100 text-blue-400"
                              : "-rotate-90 scale-0 opacity-0"
                          )}
                        />
                      </div>
                      {isAnimating && (
                        <span className={cn(
                          "absolute inset-0 rounded-lg animate-ping",
                          isLight ? "bg-[#445D41]/30" : "bg-violet-500/30 dark:bg-violet-600/40"
                        )} />
                      )}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="hidden lg:block relative" ref={dropdownRef}>
                      <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className={cn(
                          "flex items-center gap-2.5 pl-3 ml-3 transition-colors duration-150 hover:opacity-80",
                          isLight ? "border-l border-[#445D41]/10" : "border-l border-slate-800 dark:border-gray-800"
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-[#445D41] flex items-center justify-center text-white font-bold text-sm transition-all duration-150 shadow-lg shadow-[#445D41]/30">
                          {userInitial}
                        </div>
                        <div className="text-left">
                          <p className={cn(
                            "text-sm font-semibold leading-tight transition-colors duration-150",
                            isLight ? "text-gray-800" : "text-slate-800 dark:text-white"
                          )}>
                            {userName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full transition-colors duration-150"></div>
                            <p className={cn(
                              "text-xs transition-colors duration-150",
                              isLight ? "text-gray-400" : "text-slate-400 dark:text-gray-500"
                            )}>
                              Online
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isLight ? "text-gray-400" : "text-slate-400",
                            profileDropdownOpen && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {profileDropdownOpen && (
                        <div className={cn(
                          "absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50",
                          isLight
                            ? "bg-white border-[#445D41]/20"
                            : "bg-slate-900 dark:bg-gray-900 border-slate-800 dark:border-gray-800"
                        )}>
                          <div className={cn("p-3 border-b", isLight ? "border-[#445D41]/10" : "border-slate-800 dark:border-gray-800")}>
                            <p className={cn("text-sm font-semibold", isLight ? "text-gray-800" : "text-slate-800 dark:text-white")}>
                              {userName}
                            </p>
                            <p className={cn("text-xs mt-0.5", isLight ? "text-gray-500" : "text-slate-500 dark:text-gray-500")}>
                              {userEmail}
                            </p>
                          </div>

                          <div className="p-2">
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setChangePwdOpen(true);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                                isLight
                                  ? "text-gray-600 hover:text-[#445D41] hover:bg-[#445D41]/5"
                                  : "text-slate-300 hover:text-white hover:bg-slate-800/70 dark:hover:bg-gray-800/70"
                              )}
                            >
                              <LockKeyhole className={cn("h-4 w-4 group-hover:scale-110 transition-transform", isLight ? "text-[#445D41]" : "text-violet-400")} />
                              <span className="text-sm font-medium">Change Password</span>
                            </button>

                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-red-400 dark:hover:text-red-500 hover:bg-red-500/10 transition-all duration-150 group mt-1"
                            >
                              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform text-red-400" />
                              <span className="text-sm font-medium text-red-400">Logout</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className={cn(
              "flex-1 overflow-y-auto p-6 custom-scrollbar transition-colors duration-500",
              isLight ? "bg-gray-50" : "bg-slate-100 dark:bg-slate-950"
            )}>
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
          
          html.dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.4);
          }
          html.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(107, 114, 128, 0.6);
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}