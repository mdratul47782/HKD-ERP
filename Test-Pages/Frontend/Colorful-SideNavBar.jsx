// Test-Pages/Frontend/Colorful-SideNavBar.jsx

// frontend/app/SideNavBarComponent/SideNavbar.jsx

"use client";

import { useDarkMode } from "@/app/provider/DarkModeProvider";
import { useSidebar } from "@/app/provider/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Database,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Scissors,
  Settings,
  Sun,
  X,
  ShieldUser
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import UserPanel from "./UserPanel";

export default function SideNavbar() {
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useDarkMode();
  const { expanded, setExpanded } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    router.push("/login");
  };

  const userName = user?.user_name || "";
  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));

  // Each nav item now carries its own accent color for a bold, colorful badge look
  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-100 dark:bg-sky-500/15",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-100 dark:bg-violet-500/15",
    },
    {
      href: "/cutting",
      label: "Cutting",
      icon: Scissors,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-100 dark:bg-rose-500/15",
    },
    {
      href: "/json-demo",
      label: "JSON Demo",
      icon: Database,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/15",
    },
    {
      href: "/admin/users",
      label: "Manage Users",
      icon: ShieldUser,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-500/15",
    },
  ];

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 h-full flex-col
          bg-[#f9f9f8] dark:bg-[#212121]
          border-r border-black/5 dark:border-white/[0.07]
          transition-all duration-200 ease-in-out
          ${expanded ? "w-52" : "w-[52px]"}`}
      >
        {/* TOP — Logo + Toggle */}
        <div
          className={`flex items-center h-12 px-3 flex-shrink-0 ${expanded ? "justify-between" : "justify-center"}`}
        >
          {expanded && (
            <Link href="/" className="flex items-center gap-2 overflow-hidden">
              <Image
                src="/HKD_LOGO.png"
                alt="HKD"
                width={22}
                height={22}
                className="object-contain flex-shrink-0"
                priority
              />
              <span className="text-[13px] font-semibold text-slate-800 dark:text-[#ececec] truncate">
                HKD Outdoor
              </span>
            </Link>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 dark:text-[#8a8a8a] hover:text-slate-700 dark:hover:text-[#ececec] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all"
          >
            {expanded ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
          </button>
        </div>

        {/* NAV ITEMS */}
        <div className="flex-1 flex flex-col gap-1 px-2 py-1 overflow-hidden">
          {navItems.map(({ href, icon: Icon, label, color, bg }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={`group flex items-center gap-2.5 h-9 rounded-lg px-1.5 transition-all duration-150
                  ${
                    active
                      ? "bg-black/[0.06] dark:bg-white/[0.07]"
                      : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  }
                  ${expanded ? "" : "justify-center"}`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all ${bg}`}
                >
                  <Icon size={16} strokeWidth={2.5} className={color} />
                </div>
                {expanded && (
                  <span
                    className={`text-[13px] font-semibold truncate leading-none ${
                      active
                        ? "text-slate-900 dark:text-[#ececec]"
                        : "text-slate-600 dark:text-[#a3a3a3]"
                    }`}
                  >
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex flex-col gap-0.5 px-2 pb-3 flex-shrink-0">
          <button
            onClick={toggleDark}
            title={!expanded ? (dark ? "Light mode" : "Dark mode") : undefined}
            className={`group flex items-center gap-2.5 h-9 rounded-lg px-1.5 transition-all duration-150
              hover:bg-black/[0.04] dark:hover:bg-white/[0.05]
              ${expanded ? "" : "justify-center"}`}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 bg-orange-100 dark:bg-orange-500/15">
              {dark ? (
                <Sun size={16} strokeWidth={2.5} className="text-orange-500 dark:text-orange-400" />
              ) : (
                <Moon size={16} strokeWidth={2.5} className="text-orange-500 dark:text-orange-400" />
              )}
            </div>
            {expanded && (
              <span className="text-[13px] font-semibold text-slate-600 dark:text-[#a3a3a3]">
                {dark ? "Light mode" : "Dark mode"}
              </span>
            )}
          </button>

          <div className="h-px bg-black/5 dark:bg-white/[0.07] mx-1 my-1" />

          {user ? (
            <button
              onClick={() => setPanelOpen((p) => !p)}
              title={!expanded ? userName || "Profile" : undefined}
              className={`group flex items-center gap-2.5 h-9 rounded-lg px-1.5 transition-all duration-150 w-full
                ${
                  panelOpen
                    ? "bg-black/[0.06] dark:bg-white/[0.07]"
                    : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                }
                ${expanded ? "" : "justify-center"}`}
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
                {userName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              {expanded && (
                <span className="text-[13px] font-semibold text-slate-800 dark:text-[#ececec] truncate flex-1 text-left">
                  {userName}
                </span>
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className={`group flex items-center gap-2.5 h-9 rounded-lg px-1.5 transition-all duration-150
                hover:bg-black/[0.04] dark:hover:bg-white/[0.05]
                ${expanded ? "" : "justify-center"}`}
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 bg-sky-100 dark:bg-sky-500/15">
                <LogIn size={16} strokeWidth={2.5} className="text-sky-600 dark:text-sky-400" />
              </div>
              {expanded && (
                <span className="text-[13px] font-semibold text-slate-600 dark:text-[#a3a3a3]">Login</span>
              )}
            </Link>
          )}
        </div>
      </aside>

      {/* ── USER PANEL (slide-over) ──────────────────────────────────── */}
      <UserPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      {/* ── MOBILE TOP BAR ──────────────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4
        bg-[#f9f9f8]/95 dark:bg-[#212121]/98 backdrop-blur-md
        border-b border-black/5 dark:border-white/[0.07]"
      >
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/HKD_LOGO.png"
            alt="HKD"
            width={24}
            height={24}
            className="object-contain"
            priority
          />
          <span className="text-[14px] font-semibold text-slate-800 dark:text-[#ececec]">
            HKD Outdoor
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-orange-100 dark:bg-orange-500/15 transition-all"
          >
            {dark ? (
              <Sun size={17} strokeWidth={2.5} className="text-orange-500 dark:text-orange-400" />
            ) : (
              <Moon size={17} strokeWidth={2.5} className="text-orange-500 dark:text-orange-400" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-[#ececec] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all"
          >
            <Menu size={19} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40
        bg-[#f9f9f8]/95 dark:bg-[#212121]/98 backdrop-blur-md
        border-t border-black/5 dark:border-white/[0.07]"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map(({ href, icon: Icon, label, color, bg }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-4 py-2.5 min-w-0 flex-1 transition-all"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                    active ? bg : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={2.5}
                    className={active ? color : "text-slate-400 dark:text-[#555]"}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-none ${
                    active ? "text-slate-900 dark:text-[#ececec]" : "text-slate-400 dark:text-[#555]"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          {user ? (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2.5 min-w-0 flex-1 text-slate-400 dark:text-[#555] transition-all"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </div>
              <span className="text-[10px] font-semibold leading-none">Me</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center gap-1 px-4 py-2.5 min-w-0 flex-1 text-slate-400 dark:text-[#555]"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-100 dark:bg-sky-500/15">
                <LogIn size={18} strokeWidth={2.5} className="text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-[10px] font-semibold leading-none">Login</span>
            </Link>
          )}
        </div>
      </nav>

      {/* ── MOBILE DRAWER ───────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div
            className="absolute bottom-0 left-0 right-0
            bg-[#f9f9f8] dark:bg-[#252525]
            rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 bg-slate-200 dark:bg-[#3a3a3a] rounded-full" />
            </div>

            {/* User header */}
            {user && (
              <div className="flex items-center gap-3 px-5 py-3 mb-1">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-[#ececec] truncate">
                    {userName || "User"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#8a8a8a] truncate">
                    {user?.role || "Member"}
                  </p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-[#333] flex items-center justify-center text-slate-500 dark:text-[#8a8a8a] flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="h-px bg-black/5 dark:bg-white/[0.06] mx-5 mb-2" />

            {/* Nav links */}
            <div className="px-3 space-y-0.5">
              {navItems.map(({ href, icon: Icon, label, color, bg }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 h-11 px-2.5 rounded-xl text-[14px] font-semibold transition-all
                      ${
                        active
                          ? "bg-black/[0.06] dark:bg-white/[0.07] text-slate-900 dark:text-[#ececec]"
                          : "text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05]"
                      }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${bg}`}>
                      <Icon size={16} strokeWidth={2.5} className={color} />
                    </div>
                    {label}
                  </Link>
                );
              })}
              {user && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 h-11 px-2.5 rounded-xl text-[14px] font-semibold transition-all
                    ${
                      isActive("/dashboard")
                        ? "bg-black/[0.06] dark:bg-white/[0.07] text-slate-900 dark:text-[#ececec]"
                        : "text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05]"
                    }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-indigo-100 dark:bg-indigo-500/15">
                    <Settings size={16} strokeWidth={2.5} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Profile settings
                </Link>
              )}
            </div>

            <div className="h-px bg-black/5 dark:bg-white/[0.06] mx-5 my-3" />

            {/* Actions */}
            <div className="px-3 pb-8 space-y-0.5">
              <button
                onClick={toggleDark}
                className="w-full flex items-center gap-3 h-11 px-2.5 rounded-xl text-[14px] font-semibold
                  text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05] transition-all"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-orange-100 dark:bg-orange-500/15">
                  {dark ? (
                    <Sun size={16} strokeWidth={2.5} className="text-orange-500 dark:text-orange-400" />
                  ) : (
                    <Moon size={16} strokeWidth={2.5} className="text-orange-500 dark:text-orange-400" />
                  )}
                </div>
                {dark ? "Switch to Light" : "Switch to Dark"}
              </button>

              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 h-11 px-2.5 rounded-xl text-[14px] font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-red-100 dark:bg-red-500/15">
                    <LogOut size={16} strokeWidth={2.5} className="text-red-500 dark:text-red-400" />
                  </div>
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 h-11 px-2.5 rounded-xl text-[14px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-all"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-sky-100 dark:bg-sky-500/15">
                    <LogIn size={16} strokeWidth={2.5} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}