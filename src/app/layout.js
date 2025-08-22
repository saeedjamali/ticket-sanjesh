import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "@/components/providers/Providers";

// Local fonts are now loaded via CSS @font-face in globals.css and font.css
// No need for Google Fonts imports - they're defined as CSS variables:
// --font-sans for Inter
// --font-mono for Roboto Mono

export const metadata = {
  title: "سامانه رصد",
  description: "سامانه رصد و گزارش‌گیری",
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
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
