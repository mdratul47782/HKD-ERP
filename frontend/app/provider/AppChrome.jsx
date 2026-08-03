"use client";

import { usePathname } from "next/navigation";
import TopNavbar from "@/app/SideNavBarComponent/TopNavbar";
import DeptSidebar from "@/app/SideNavBarComponent/DeptSidebar";
import MainWrapper from "@/app/provider/MainWrapper";

// Routes that should render WITHOUT the navbar/sidebar chrome
const NO_CHROME_ROUTES = ["/login", "/register"];

export default function AppChrome({ children }) {
  const pathname = usePathname();
  const hideChrome = NO_CHROME_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <TopNavbar />
      <DeptSidebar />
      <MainWrapper>{children}</MainWrapper>
    </>
  );
}