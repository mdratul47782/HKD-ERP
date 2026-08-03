// frontend/app/SideNavBarComponent/TopNavbar.jsx

"use client";

import { useDarkMode } from "@/app/provider/DarkModeProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
  ShieldUser,
  Palette,
  Settings,
  TrendingUp,
  Box,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import UserPanel from "./UserPanel";

// Primary nav — lives in the top navbar now
const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/admin/users", label: "Manage Users", icon: ShieldUser },
  { href: "/StyleRegister", label: "Style Register", icon: Palette },
];

// Departments — mirrors DeptSidebar, used for the mobile drawer since the
// side navbar is desktop-only
const DEPARTMENTS = [
  { href: "/sales", label: "Sales", icon: TrendingUp },
  { href: "/cad", label: "CAD", icon: Box },
  { href: "/mc", label: "MC", icon: Wrench },
];

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useDarkMode();
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

  return (
    <>
      {/* ── DESKTOP TOP NAVBAR ─────────────────────────────────────────── */}
      <header
        className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-14 items-center justify-between px-4
        bg-[#f9f9f8]/95 dark:bg-[#212121]/98 backdrop-blur-md
        border-b border-black/5 dark:border-white/[0.07]"
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/HKD_LOGO.png"
              alt="HKD"
              width={24}
              height={24}
              className="object-contain"
              priority
            />
            <span className="text-[14px] font-semibold text-slate-800 dark:text-[#ececec]">
              HKD OUTDOOR INNOVATIONS LTD.
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 h-8 px-3 rounded-md text-[13px] font-medium transition-all
                    ${
                      active
                        ? "bg-black/[0.08] dark:bg-white/[0.09] text-slate-900 dark:text-[#ececec]"
                        : "text-slate-600 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-[#ececec]"
                    }`}
                >
                  <Icon size={15} strokeWidth={active ? 2 : 1.75} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="h-8 w-8 rounded-md flex items-center justify-center text-slate-500 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all"
          >
            {dark ? (
              <Sun size={16} strokeWidth={1.75} />
            ) : (
              <Moon size={16} strokeWidth={1.75} />
            )}
          </button>

          <div className="h-5 w-px bg-black/10 dark:bg-white/10 mx-1" />

          {user ? (
            <button
              onClick={() => setPanelOpen((p) => !p)}
              className={`flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-md transition-all
                ${
                  panelOpen
                    ? "bg-black/[0.08] dark:bg-white/[0.09]"
                    : "hover:bg-black/5 dark:hover:bg-white/[0.06]"
                }`}
            >
              <div className="h-6 w-6 rounded-full overflow-hidden bg-amber-100 dark:bg-[#3d2f1a] flex items-center justify-center text-amber-700 dark:text-[#d4a45a] text-[10px] font-bold flex-shrink-0 ring-1 ring-amber-200 dark:ring-[#5a3e1e]">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userName?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              <span className="text-[13px] font-medium text-slate-800 dark:text-[#ececec] max-w-[100px] truncate">
                {userName}
              </span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 h-8 px-3 rounded-md text-[13px] font-medium text-slate-600 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-[#ececec] transition-all"
            >
              <LogIn size={15} strokeWidth={1.75} />
              Login
            </Link>
          )}
        </div>
      </header>

      {/* ── USER PANEL (dropdown, anchored under avatar) ──────────────── */}
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
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all"
          >
            {dark ? (
              <Sun size={17} strokeWidth={1.75} />
            ) : (
              <Moon size={17} strokeWidth={1.75} />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all"
          >
            <Menu size={19} strokeWidth={1.75} />
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
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-2.5 min-w-0 flex-1 transition-all ${
                  active
                    ? "text-slate-900 dark:text-[#ececec]"
                    : "text-slate-400 dark:text-[#555]"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${active ? "bg-black/[0.08] dark:bg-white/[0.09]" : ""}`}
                >
                  <Icon size={18} strokeWidth={active ? 2 : 1.75} />
                </div>
                <span className="text-[10px] font-medium leading-none truncate">
                  {label}
                </span>
              </Link>
            );
          })}

          {user ? (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-1 px-3 py-2.5 min-w-0 flex-1 text-slate-400 dark:text-[#555] transition-all"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                <div className="h-6 w-6 rounded-full overflow-hidden bg-amber-100 dark:bg-[#3d2f1a] flex items-center justify-center text-amber-700 dark:text-[#d4a45a] text-[10px] font-bold ring-1 ring-amber-200 dark:ring-[#5a3e1e]">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    userName?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
              </div>
              <span className="text-[10px] font-medium leading-none">Me</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center gap-1 px-3 py-2.5 min-w-0 flex-1 text-slate-400 dark:text-[#555]"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                <LogIn size={18} strokeWidth={1.75} />
              </div>
              <span className="text-[10px] font-medium leading-none">
                Login
              </span>
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
                <div className="h-10 w-10 rounded-2xl overflow-hidden bg-amber-100 dark:bg-[#3d2f1a] flex items-center justify-center text-amber-700 dark:text-[#d4a45a] font-bold text-sm ring-1 ring-amber-200 dark:ring-[#5a3e1e] flex-shrink-0">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    userName?.charAt(0)?.toUpperCase() || "U"
                  )}
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

            {/* Primary nav links */}
            <div className="px-3 space-y-0.5">
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium transition-all
                      ${
                        active
                          ? "bg-black/[0.07] dark:bg-white/[0.08] text-slate-900 dark:text-[#ececec]"
                          : "text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-[#ececec]"
                      }`}
                  >
                    <Icon size={17} strokeWidth={active ? 2 : 1.75} />
                    {label}
                  </Link>
                );
              })}
              {user && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium transition-all
                    ${
                      isActive("/dashboard")
                        ? "bg-black/[0.07] dark:bg-white/[0.08] text-slate-900 dark:text-[#ececec]"
                        : "text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-[#ececec]"
                    }`}
                >
                  <Settings size={17} strokeWidth={1.75} />
                  Profile settings
                </Link>
              )}
            </div>

            <div className="h-px bg-black/5 dark:bg-white/[0.06] mx-5 my-3" />

            {/* Departments (side navbar is desktop-only, so surface here on mobile) */}
            <p className="px-6 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#777]">
              Departments
            </p>
            <div className="px-3 space-y-0.5 pb-2">
              {DEPARTMENTS.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium transition-all
                      ${
                        active
                          ? "bg-black/[0.07] dark:bg-white/[0.08] text-slate-900 dark:text-[#ececec]"
                          : "text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-[#ececec]"
                      }`}
                  >
                    <Icon size={17} strokeWidth={active ? 2 : 1.75} />
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="h-px bg-black/5 dark:bg-white/[0.06] mx-5 my-3" />

            {/* Actions */}
            <div className="px-3 pb-8 space-y-0.5">
              <button
                onClick={toggleDark}
                className="w-full flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium
                  text-slate-600 dark:text-[#aaa] hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-[#ececec] transition-all"
              >
                {dark ? (
                  <Sun size={17} strokeWidth={1.75} />
                ) : (
                  <Moon size={17} strokeWidth={1.75} />
                )}
                {dark ? "Switch to Light" : "Switch to Dark"}
              </button>

              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                >
                  <LogOut size={17} strokeWidth={1.75} />
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-all"
                >
                  <LogIn size={17} strokeWidth={1.75} />
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