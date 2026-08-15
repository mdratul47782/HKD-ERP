// frontend/app/SideNavBarComponent/DeptSidebar.jsx

"use client";

import { useSidebar } from "@/app/provider/SidebarContext";
import { TrendingUp, Box, Wrench, Warehouse, PackageSearch, MapPin, Boxes, PanelLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DEPARTMENTS = [
  {
    label: "Material Warehouse",
    icon: Warehouse,
    items: [
      { href: "/material-warehouse/material-receive", label: "Material Receive", icon: PackageSearch },
      { href: "/material-warehouse/location-assignment", label: "Location Assignment", icon: MapPin },
      { href: "/material-warehouse/material-stock", label: "Material Stock", icon: Boxes },
    ],
  },
];

export default function DeptSidebar() {
  const { expanded, setExpanded } = useSidebar();
  const pathname = usePathname();

  const isActive = (href) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    // top-14 = sits directly below the 56px top navbar. Desktop-only —
    // departments are reachable on mobile via the drawer in TopNavbar.
    <aside
      className={`hidden md:flex fixed left-0 top-14 bottom-0 z-30 flex-col
        bg-[#f9f9f8] dark:bg-[#212121]
        border-r border-black/5 dark:border-white/[0.07]
        transition-all duration-200 ease-in-out
        ${expanded ? "w-52" : "w-[52px]"}`}
    >
      {/* TOP — Label + Toggle */}
      <div
        className={`flex items-center h-12 px-3 flex-shrink-0 ${expanded ? "justify-between" : "justify-center"}`}
      >
        {expanded && (
          <span className="text-[12px] font-semibold text-slate-600 dark:text-[#c9c9c9] truncate uppercase tracking-wide">
            Departments
          </span>
        )}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 dark:text-[#8a8a8a] hover:text-slate-700 dark:hover:text-[#ececec] hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all"
        >
          {expanded ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
        </button>
      </div>

      {/* DEPARTMENT ITEMS */}
      <div className="flex-1 flex flex-col gap-0.5 px-2 py-1 overflow-hidden">
        {DEPARTMENTS.map((dept) => (
          <div key={dept.label} className="flex flex-col gap-0.5">
            {expanded && (
              <div className="flex items-center gap-2 h-8 px-2 text-slate-500 dark:text-[#8a8a8a]">
                <dept.icon size={14} strokeWidth={1.75} className="flex-shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{dept.label}</span>
              </div>
            )}
            {dept.items.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={!expanded ? label : undefined}
                  className={`group flex items-center gap-3 h-8 rounded-md px-2 transition-all duration-150
                    ${
                      active
                        ? "bg-black/[0.08] dark:bg-white/[0.09] text-slate-900 dark:text-[#ececec]"
                        : "text-slate-600 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-[#ececec]"
                    }
                    ${expanded ? "" : "justify-center"}`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2 : 1.75}
                    className="flex-shrink-0"
                  />
                  {expanded && (
                    <span className="text-[13px] font-medium truncate leading-none">
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}