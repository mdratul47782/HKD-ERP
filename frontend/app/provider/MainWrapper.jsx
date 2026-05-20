// frontend/app/provider/MainWrapper.jsx

// frontend/app/provider/MainWrapper.jsx
"use client";
import { useSidebar } from "./SidebarContext";

export default function MainWrapper({ children }) {
  const { expanded } = useSidebar();
  return (
    <main className={`flex-1 transition-all duration-300 ${expanded ? "md:ml-52" : "md:ml-13"}`}>
      {children}
    </main>
  );
}