"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/CustomToast";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-provider";
import { authService } from "@/lib/services/auth";

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
}

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
    name: 'Promotions',
    icon: Gift,
    children: [
      { name: 'Discounts', href: '/admin/discounts', icon: Percent },
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
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userInitial, setUserInitial] = useState<string>('A');
  const [isHovering, setIsHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isActiveRoute = (navHref: string, currentPath: string) => {
    if (navHref === '/admin' && currentPath === '/admin') return true;
    if (navHref !== '/admin' && currentPath.startsWith(navHref)) return true;
    return false;
  };

  const isParentActive = (children?: NavigationItem[]) => {
    if (!children) return false;
    return children.some(child => child.href && isActiveRoute(child.href, pathname));
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => {
      if (prev[menuName]) {
        return { [menuName]: false };
      }
      return { [menuName]: true };
    });
  };

  // 🔥 SIMPLE TOGGLE: Light ↔ Dark (2 states only)
const handleThemeToggle = () => {
  setIsAnimating(true);
  const newTheme = theme === "light" ? "dark" : "light";
  setTheme(newTheme);
  
  // 🔥 WITH POSITION
  if (newTheme === "dark") {
    toast.success("🌙 Dark Mode Enabled", {
      autoClose: 2000,
      position: "top-center" // ✅ Works now!
    });
  } else {
    toast.success("☀️ Light Mode Enabled", {
      autoClose: 2000,
      position: "top-center" // ✅ Different position
    });
  }
  
  setTimeout(() => setIsAnimating(false), 600);
};

 useEffect(() => {
    const interval = setInterval(() => {
      const loggedIn = authService.isAuthenticated();
      if (!loggedIn) {
        authService.logout();
        router.replace("/login");
      }
    }, 5000); // 🔥 every 5 seconds check

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children && isParentActive(item.children)) {
        setExpandedMenus({ [item.name]: true });
      }
    });
  }, [pathname]);

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
    router.push('/login');
  };

  const isSidebarExpanded = (!sidebarCollapsed || isHovering);
  const sidebarWidth = isSidebarExpanded ? 'w-64' : 'w-16';

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-gray-950 relative overflow-hidden transition-colors duration-500">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] transition-all duration-500" />

      {/* Gradient Orbs */}
      <div className="fixed top-0 -left-4 w-96 h-96 bg-violet-500 dark:bg-violet-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob transition-all duration-500" />
      <div className="fixed top-0 -right-4 w-96 h-96 bg-cyan-500 dark:bg-cyan-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob animation-delay-2000 transition-all duration-500" />
      <div className="fixed -bottom-8 left-1/2 w-96 h-96 bg-pink-500 dark:bg-pink-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-15 animate-blob animation-delay-4000 transition-all duration-500" />

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={cn(
            "hidden lg:flex fixed h-full bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-800 dark:border-gray-800 flex-col transition-all duration-300 z-50",
            sidebarWidth
          )}
        >
          {/* Logo */}
          <div className="p-3 border-b border-slate-800 dark:border-gray-800 flex-shrink-0 h-[73px] flex items-center transition-colors duration-300">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-lg dark:shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {isSidebarExpanded && (
                <div className="whitespace-nowrap">
                  <h2 className="text-lg font-bold text-white transition-colors duration-300">EcomPanel</h2>
                  <p className="text-xs text-slate-400 dark:text-gray-500 transition-colors duration-300">Admin Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
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
                      onClick={() => isSidebarExpanded && toggleMenu(item.name)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                        isParentItemActive
                          ? "bg-slate-800/70 dark:bg-gray-800/80 text-white"
                          : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                      )}
                      title={!isSidebarExpanded ? item.name : ""}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      {isSidebarExpanded && (
                        <>
                          <span className="font-medium text-sm flex-1 text-left whitespace-nowrap">
                            {item.name}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-all duration-300",
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
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-800 dark:border-gray-800 pl-2 transition-colors duration-300">
                          {item.children?.map((child, index) => {
                            const ChildIcon = child.icon;
                            const isChildActive = child.href ? isActiveRoute(child.href, pathname) : false;

                            return (
                              <Link
                                key={child.name}
                                href={child.href || '#'}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                                  isChildActive
                                    ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                                    : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60",
                                  isExpanded && "animate-slideIn"
                                )}
                                style={{
                                  animationDelay: `${index * 50}ms`,
                                }}
                              >
                                <ChildIcon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                      : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                  )}
                  title={!isSidebarExpanded ? item.name : ""}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
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
          <div className="p-2 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 space-y-1 transition-colors duration-300">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-200"
              title={!isSidebarExpanded ? "View Store" : ""}
            >
              <Store className="h-5 w-5 flex-shrink-0" />
              {isSidebarExpanded && (
                <span className="font-medium text-sm whitespace-nowrap">View Store</span>
              )}
            </Link>
            <button 
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-200"
              title={!isSidebarExpanded ? "Settings" : ""}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {isSidebarExpanded && (
                <span className="font-medium text-sm whitespace-nowrap">Settings</span>
              )}
            </button>
          </div>

          {/* User Profile - Expanded */}
          {isSidebarExpanded && (
            <div className="p-3 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-300">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 dark:bg-gray-800/70 transition-colors duration-300">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-all duration-300 shadow-lg dark:shadow-violet-500/30">
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate transition-colors duration-300">{userName}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 truncate transition-colors duration-300">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 transition-colors duration-200"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* User Profile - Collapsed */}
          {!isSidebarExpanded && (
            <div className="p-2 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-300">
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-300 shadow-lg dark:shadow-violet-500/30">
                  {userInitial}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar - Same pattern */}
        <aside
          className={cn(
            "fixed lg:hidden h-full w-64 bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-slate-800 dark:border-gray-800 flex flex-col transition-all duration-300 z-50",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-3 border-b border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center transition-all duration-300 shadow-lg dark:shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white transition-colors duration-300">EcomPanel</h2>
                <p className="text-xs text-slate-400 dark:text-gray-500 transition-colors duration-300">Admin Dashboard</p>
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
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                        isParentItemActive
                          ? "bg-slate-800/70 dark:bg-gray-800/80 text-white"
                          : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                      )}
                    >
                      <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-all duration-300",
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
                      <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-800 dark:border-gray-800 pl-3 transition-colors duration-300">
                        {item.children?.map((child, index) => {
                          const ChildIcon = child.icon;
                          const isChildActive = child.href ? isActiveRoute(child.href, pathname) : false;

                          return (
                            <Link
                              key={child.name}
                              href={child.href || '#'}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                                isChildActive
                                  ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                                  : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60",
                                isExpanded && "animate-slideIn"
                              )}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <ChildIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
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
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 text-white shadow-lg shadow-violet-500/30 dark:shadow-violet-600/50"
                      : "text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60"
                  )}
                >
                  <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium text-sm flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="h-4 w-4 animate-pulse" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 space-y-1.5 transition-colors duration-300">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-200"
            >
              <Store className="h-5 w-5" />
              <span className="font-medium text-sm">View Store</span>
            </Link>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800/50 dark:hover:bg-gray-800/60 transition-all duration-200">
              <Settings className="h-5 w-5" />
              <span className="font-medium text-sm">Settings</span>
            </button>
          </div>

          <div className="p-4 border-t border-slate-800 dark:border-gray-800 flex-shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 dark:bg-gray-800/70 transition-colors duration-300">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-300 shadow-lg dark:shadow-violet-500/30">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate transition-colors duration-300">{userName}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 truncate transition-colors duration-300">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-500 transition-colors duration-200"
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
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm lg:hidden z-40 transition-all duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div 
          className={cn(
            "flex-1 flex flex-col overflow-hidden transition-all duration-300",
            isSidebarExpanded ? "lg:ml-64" : "lg:ml-16"
          )}
        >
          {/* Header */}
          <header className="flex-shrink-0 bg-slate-900/80 dark:bg-gray-900/90 backdrop-blur-xl border-b border-slate-800 dark:border-gray-800 z-30 transition-colors duration-300">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden p-2 text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-200"
                  >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>

                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:block p-2 text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-200"
                    title={sidebarCollapsed ? "Pin Sidebar" : "Unpin Sidebar"}
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <div className="flex-1 max-w-xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-gray-600 transition-colors duration-300" />
                      <input
                        type="search"
                        placeholder="Search products, orders, customers..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 dark:bg-gray-800/70 border border-slate-700 dark:border-gray-700 rounded-lg text-sm text-white placeholder-slate-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-600 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="relative p-2 text-slate-400 dark:text-gray-500 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-200">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 dark:bg-violet-600 rounded-full ring-2 ring-slate-900 dark:ring-gray-950 transition-all duration-300"></span>
                  </button>

                  {/* 🔥 SIMPLE 2-STATE TOGGLE BUTTON */}
                  <button
                    onClick={handleThemeToggle}
                    className={cn(
                      "relative p-2 rounded-lg transition-all duration-300 group",
                      "bg-slate-800/50 dark:bg-gray-800/70 hover:bg-slate-800 dark:hover:bg-gray-800",
                      "text-slate-400 dark:text-gray-400 hover:text-white",
                      isAnimating && "scale-110 rotate-180"
                    )}
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    <div className="relative w-5 h-5">
                      {/* Sun Icon - Light Mode */}
                      <Sun 
                        className={cn(
                          "absolute inset-0 h-5 w-5 transition-all duration-500 text-yellow-500",
                          theme === "dark" 
                            ? "rotate-90 scale-0 opacity-0" 
                            : "rotate-0 scale-100 opacity-100"
                        )} 
                      />
                      {/* Moon Icon - Dark Mode */}
                      <Moon 
                        className={cn(
                          "absolute inset-0 h-5 w-5 transition-all duration-500 text-blue-400",
                          theme === "dark" 
                            ? "rotate-0 scale-100 opacity-100" 
                            : "-rotate-90 scale-0 opacity-0"
                        )} 
                      />
                    </div>
                    
                    {/* Ripple Effect */}
                    {isAnimating && (
                      <span className="absolute inset-0 rounded-lg bg-violet-500/30 dark:bg-violet-600/40 animate-ping" />
                    )}
                  </button>

                  <div className="hidden lg:flex items-center gap-2.5 pl-3 ml-3 border-l border-slate-800 dark:border-gray-800 transition-colors duration-300">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 dark:from-violet-600 dark:to-cyan-600 flex items-center justify-center text-white font-bold text-sm transition-all duration-300 shadow-lg dark:shadow-violet-500/30">
                      {userInitial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight transition-colors duration-300">{userName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 bg-green-400 dark:bg-green-500 rounded-full transition-colors duration-300"></div>
                        <p className="text-xs text-slate-400 dark:text-gray-500 transition-colors duration-300">Online</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar transition-colors duration-500">
            <div className="transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
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
  );
}
