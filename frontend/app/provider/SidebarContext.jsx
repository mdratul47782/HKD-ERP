// frontend/app/provider/SidebarContext.jsx

// frontend/app/provider/SidebarContext.jsx
"use client";
import { createContext, useContext, useState } from "react";

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}