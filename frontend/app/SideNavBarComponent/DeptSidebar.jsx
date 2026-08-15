// frontend/app/SideNavBarComponent/DeptSidebar.jsx

"use client";

import { useState } from "react";
import { useSidebar } from "@/app/provider/SidebarContext";
import {
  TrendingUp, Box, Wrench, Warehouse, PackageSearch, MapPin, Boxes,
  PanelLeft, PanelLeftClose, FolderClosed, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Material Warehouse's pages are grouped into subfolders so the sidebar
// stays organized as more pages (Cutting Issue, etc.) get added later.
// Departments without "folders" can still use a flat "items" array.
const DEPARTMENTS = [
  {
    label: "Material Warehouse",
    icon: Warehouse,
    folders: [
      {
        label: "Receiving",
        icon: FolderClosed,
        items: [
          { href: "/material-warehouse/material-receive", label: "Material Receive", icon: PackageSearch },
        ],
      },
      {
        label: "Stock",
        icon: FolderClosed,
        items: [
          { href: "/material-warehouse/material-stock", label: "Material Stock", icon: Boxes },
        ],
      },
    ],
  },
];

// Flattened view used when the sidebar is collapsed to icon-only mode —
// folder headers don't fit in a 52px rail, so every item shows as one
// flat icon list (folder grouping only matters once labels are visible).
const flattenItems = (dept) =>
  dept.items ? dept.items : dept.folders.flatMap((f) => f.items);

export default function DeptSidebar() {
  const { expanded, setExpanded } = useSidebar();
  const pathname = usePathname();

  // Open by default; key is `${deptLabel}::${folderLabel}`.
  const [openFolders, setOpenFolders] = useState(() => {
    const initial = {};
    DEPARTMENTS.forEach((dept) => {
      (dept.folders || []).forEach((folder) => {
        initial[`${dept.label}::${folder.label}`] = true;
      });
    });
    return initial;
  });

  const toggleFolder = (key) => setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));

  const isActive = (href) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  const renderLink = ({ href, icon: Icon, label }, indent = false) => {
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
          ${expanded ? (indent ? "ml-4" : "") : "justify-center"}`}
      >
        <Icon size={15} strokeWidth={active ? 2 : 1.75} className="flex-shrink-0" />
        {expanded && <span className="text-[13px] font-medium truncate leading-none">{label}</span>}
      </Link>
    );
  };

  const renderDepartmentIcon = (dept) => {
    const Icon = dept.icon;
    return (
      <div
        key={dept.label}
        className="flex items-center justify-center h-8 w-8 rounded-md text-slate-600 dark:text-[#8a8a8a]"
        title={dept.label}
      >
        <Icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
      </div>
    );
  };

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
            {/* Collapsed: show only department icon */}
            {!expanded && renderDepartmentIcon(dept)}

            {/* Expanded: show full department with folders */}
            {expanded && (
              <>
                <div className="flex items-center gap-2 h-8 px-2 text-slate-500 dark:text-[#8a8a8a]">
                  <dept.icon size={14} strokeWidth={1.75} className="flex-shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{dept.label}</span>
                </div>

                {/* Folders */}
                {dept.folders && dept.folders.map((folder) => {
                  const key = `${dept.label}::${folder.label}`;
                  const isOpen = openFolders[key];
                  return (
                    <div key={key} className="flex flex-col gap-0.5">
                      <button
                        onClick={() => toggleFolder(key)}
                        className="flex items-center gap-1.5 h-7 px-2 ml-1 rounded-md text-slate-500 dark:text-[#8a8a8a] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-[#ececec] transition-all"
                      >
                        <ChevronRight size={12} strokeWidth={2} className={`flex-shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`} />
                        <folder.icon size={13} strokeWidth={1.75} className="flex-shrink-0" />
                        <span className="text-[11px] font-medium truncate">{folder.label}</span>
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-0.5">
                          {folder.items.map((item) => renderLink(item, true))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Flat items if no folders */}
                {dept.items && dept.items.map((item) => renderLink(item))}
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}