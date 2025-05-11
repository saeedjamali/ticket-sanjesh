import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NextAuthProvider from "@/components/providers/NextAuthProvider";
import { SidebarProvider } from "@/context/SidebarContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "سامانه تیکتینگ",
  description: "سامانه تیکتینگ مرکز آزمون",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  themeColor: "#3B82F6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        <SidebarProvider>
          <NextAuthProvider>{children}</NextAuthProvider>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
