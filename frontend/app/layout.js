// frontend/app/layout.js

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideNavbar from "./SideNavBarComponent/SideNavbar";
import DarkModeProvider from "./provider/DarkModeProvider";
import { AuthProvider } from "@/app/provider/AuthProvider";
import { SidebarProvider } from "./provider/SidebarContext";
import MainWrapper from "./provider/MainWrapper";
// export { useAuth } from "@/app/provider/AuthProvider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "HKD Outdoor Innovations",
  description: "HKD Outdoor Innovations Ltd. - Authentication System",
  icons: {
    icon: "/HKD_LOGO.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <DarkModeProvider>
            <SidebarProvider>
              <SideNavbar />
              <MainWrapper>{children}</MainWrapper>
            </SidebarProvider>
          </DarkModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}